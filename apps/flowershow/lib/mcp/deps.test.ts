import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
    MCP_ANON_HOURLY_LIMIT: undefined as string | undefined,
  },
}));
vi.mock('@/env.mjs', () => mockEnv);
vi.mock('@/lib/anon-site', () => ({ createAnonSite: vi.fn() }));
vi.mock('@/app/api/sites/id/[siteId]/sync/route', () => ({ POST: vi.fn() }));
vi.mock('@/app/api/sites/id/[siteId]/status/route', () => ({ GET: vi.fn() }));
vi.mock('@/app/api/sites/route', () => ({ POST: vi.fn() }));
vi.mock('@/lib/claim-anon-site', () => ({ claimAnonSite: vi.fn() }));
vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn(), findMany: vi.fn() },
    blob: { findMany: vi.fn() },
    publishFile: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/content-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/content-store')>()),
  fetchFile: vi.fn(),
}));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}));
vi.mock('./limits', () => ({
  checkAnonCreateLimits: vi.fn(async () => null),
  checkAnonUpdateLimit: vi.fn(async () => true),
  reportGlobalLimitReached: vi.fn(async () => {}),
  signInHint: () => 'SIGN_IN_HINT',
  MCP_ANON_LIMITS: { perCaller: 10, perIp: 10, perSiteUpdates: 60 },
}));

import { GET as statusGET } from '@/app/api/sites/id/[siteId]/status/route';
import { POST as syncPOST } from '@/app/api/sites/id/[siteId]/sync/route';
import { POST as createSitePOST } from '@/app/api/sites/route';
import { hashIp } from '@/lib/anon-rate-limit';
import { createAnonSite } from '@/lib/anon-site';
import {
  ANONYMOUS_USER_ID,
  generateSiteClaimToken,
} from '@/lib/anonymous-user';
import { claimAnonSite } from '@/lib/claim-anon-site';
import { fetchFile } from '@/lib/content-store';
import prisma from '@/server/db';
import { MCP_ANON_BUCKET, realMcpDeps } from './deps';
import { mcpInternalCaller } from './internal-request';
import {
  checkAnonCreateLimits,
  checkAnonUpdateLimit,
  reportGlobalLimitReached,
} from './limits';
import { ApiError, PublishError } from './publish';
import { READ_FILE_MAX_BYTES } from './server';

const create = createAnonSite as ReturnType<typeof vi.fn>;
const sync = syncPOST as ReturnType<typeof vi.fn>;
const status = statusGET as ReturnType<typeof vi.fn>;
const createSite = createSitePOST as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.env.MCP_ANON_HOURLY_LIMIT = undefined;
});

const MERGE = { mode: 'merge' as const, delete: [] };

describe('realMcpDeps', () => {
  it('creates anonymous sites in one shared MCP bucket (chat apps call from their own IPs)', async () => {
    create.mockResolvedValue({ ok: true, site: { siteId: 's1' } });
    await realMcpDeps().createAnonSite();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: hashIp(MCP_ANON_BUCKET), limit: 100 }),
    );
  });

  it('reads the MCP hourly limit from the environment', async () => {
    mockEnv.env.MCP_ANON_HOURLY_LIMIT = '7';
    create.mockResolvedValue({ ok: true, site: { siteId: 's1' } });
    await realMcpDeps().createAnonSite();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ limit: 7 }));
  });

  it('turns a refused create into an ApiError', async () => {
    create.mockResolvedValue({
      ok: false,
      status: 503,
      error: 'anon_disabled',
      message: 'off',
    });
    await expect(realMcpDeps().createAnonSite()).rejects.toMatchObject({
      status: 503,
      message: 'off',
    });
  });

  it('alerts and adds the sign-in hint when the global bucket runs out', async () => {
    create.mockImplementation(async (opts) => ({
      ok: false,
      status: 429,
      error: 'rate_limited',
      message: opts.rateLimitedMessage,
    }));
    const err = await realMcpDeps()
      .createAnonSite()
      .catch((e) => e);
    expect(err).toBeInstanceOf(PublishError);
    expect(err.message).toContain('SIGN_IN_HINT');
    expect(reportGlobalLimitReached).toHaveBeenCalledWith(100);
  });

  it('checks per-caller limits before the global bucket', async () => {
    const caller = { ip: '1.2.3.4', callerId: 'session:s1' };
    vi.mocked(checkAnonCreateLimits).mockResolvedValueOnce('caller');
    const err = await realMcpDeps(caller)
      .createAnonSite()
      .catch((e) => e);
    expect(checkAnonCreateLimits).toHaveBeenCalledWith(caller);
    expect(err).toBeInstanceOf(PublishError);
    expect(err.message).toMatch(/too many new anonymous sites/);
    expect(err.message).toContain('SIGN_IN_HINT');
    expect(create).not.toHaveBeenCalled();
  });

  it('limits publishes to an anonymous site per site', async () => {
    const token = generateSiteClaimToken('site-1', 'anon-1');
    vi.mocked(checkAnonUpdateLimit).mockResolvedValueOnce(false);
    const err = await realMcpDeps()
      .sync('site-1', [], { claimToken: token }, MERGE)
      .catch((e) => e);
    expect(checkAnonUpdateLimit).toHaveBeenCalledWith('site-1');
    expect(err).toBeInstanceOf(PublishError);
    expect(sync).not.toHaveBeenCalled();
  });

  it("does not count a claim token for another site against this site's limit", async () => {
    sync.mockResolvedValue(NextResponse.json({ toUpload: [], toUpdate: [] }));
    const token = generateSiteClaimToken('site-other', 'anon-1');
    await realMcpDeps().sync('site-1', [], { claimToken: token }, MERGE);
    await realMcpDeps().sync('site-1', [], { userId: 'u1' }, MERGE);
    expect(checkAnonUpdateLimit).not.toHaveBeenCalled();
  });

  it('calls the sync route in-process with the claim token, file list, mode and deletes', async () => {
    sync.mockResolvedValue(NextResponse.json({ toUpload: [], toUpdate: [] }));
    const files = [{ path: 'a.md', size: 1, sha: 'x' }];
    await realMcpDeps().sync(
      'site-1',
      files,
      { claimToken: 'fs_claim_t' },
      { mode: 'merge', delete: ['old.md'] },
    );
    const [req, ctx] = sync.mock.calls[0] ?? [];
    expect(req.headers.get('authorization')).toBe('Bearer fs_claim_t');
    expect(mcpInternalCaller(req)).toEqual({});
    expect(await req.json()).toEqual({
      files,
      mode: 'merge',
      delete: ['old.md'],
    });
    expect(await ctx.params).toEqual({ siteId: 'site-1' });
  });

  it('sends a dry run as ?dryRun=true without counting it against the site limit', async () => {
    sync.mockResolvedValue(NextResponse.json({ toUpload: [], toUpdate: [] }));
    const token = generateSiteClaimToken('site-1', 'anon-1');
    await realMcpDeps().sync(
      'site-1',
      [],
      { claimToken: token },
      { mode: 'replace', delete: [], dryRun: true },
    );
    const [req] = sync.mock.calls[0] ?? [];
    expect(req.nextUrl.searchParams.get('dryRun')).toBe('true');
    expect(checkAnonUpdateLimit).not.toHaveBeenCalled();
  });

  it('acts for a signed-in user with the in-process marker, never forwarding a bearer', async () => {
    sync.mockResolvedValue(NextResponse.json({ toUpload: [], toUpdate: [] }));
    await realMcpDeps().sync('site-1', [], { userId: 'u1' }, MERGE);
    const [req] = sync.mock.calls[0] ?? [];
    expect(req.headers.get('authorization')).toBeNull();
    expect(mcpInternalCaller(req)).toEqual({ userId: 'u1' });
  });

  it('creates account sites through POST /api/sites, never overwriting on a name clash', async () => {
    createSite
      .mockResolvedValueOnce(
        NextResponse.json({ error: 'site_exists' }, { status: 409 }),
      )
      .mockResolvedValueOnce(
        NextResponse.json(
          { site: { id: 's9', url: 'https://notes-2-alice.flowershow.me' } },
          { status: 201 },
        ),
      );
    const site = await realMcpDeps().createUserSite('u1', 'notes');
    expect(site).toEqual({
      siteId: 's9',
      liveUrl: 'https://notes-2-alice.flowershow.me',
    });
    const bodies = await Promise.all(
      createSite.mock.calls.map(([r]) => r.clone().json()),
    );
    expect(bodies).toEqual([
      { projectName: 'notes' },
      { projectName: 'notes-2' },
    ]);
    for (const [r] of createSite.mock.calls) {
      expect(mcpInternalCaller(r)).toEqual({ userId: 'u1' });
      expect(r.headers.get('authorization')).toBeNull();
    }
  });

  it('maps a sync error response to ApiError with its status', async () => {
    sync.mockResolvedValue(
      NextResponse.json({ error: 'claimed', message: 'm' }, { status: 409 }),
    );
    const err = await realMcpDeps()
      .sync('site-1', [], { claimToken: 'fs_claim_t' }, MERGE)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'claimed' });
  });

  it('polls status in-process with the claim token', async () => {
    status.mockResolvedValue(NextResponse.json({ status: 'complete' }));
    expect(
      await realMcpDeps().status('site-1', { claimToken: 'fs_claim_t' }),
    ).toEqual({
      status: 'complete',
    });
    expect(status.mock.calls[0]?.[0].headers.get('authorization')).toBe(
      'Bearer fs_claim_t',
    );
  });

  describe('claimSite', () => {
    const claim = claimAnonSite as ReturnType<typeof vi.fn>;
    const findUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>;

    it('refuses a claim token for another site without touching the database', async () => {
      const token = generateSiteClaimToken('site-other', 'anon-1');
      await expect(
        realMcpDeps().claimSite('u1', 'site-1', token),
      ).rejects.toMatchObject({ status: 403 });
      expect(claim).not.toHaveBeenCalled();
    });

    it('claims through the shared atomic claimAnonSite and returns the site URL', async () => {
      const token = generateSiteClaimToken('site-1', 'anon-1');
      claim.mockResolvedValue({
        ok: true,
        site: { id: 'site-1', projectName: 'p', userId: 'u1' },
        method: 'link',
      });
      findUnique.mockResolvedValue({
        id: 'site-1',
        projectName: 'p',
        customDomain: null,
        subdomain: 'p-anon',
        user: { username: 'alice' },
      });
      const site = await realMcpDeps().claimSite('u1', 'site-1', token);
      expect(claim).toHaveBeenCalledWith({
        siteId: 'site-1',
        userId: 'u1',
        claimToken: token,
      });
      expect(site).toMatchObject({ siteId: 'site-1', name: 'p' });
    });

    it('explains an already-claimed site', async () => {
      const token = generateSiteClaimToken('site-1', 'anon-1');
      claim.mockResolvedValue({ ok: false, status: 409, error: 'x' });
      await expect(
        realMcpDeps().claimSite('u1', 'site-1', token),
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringMatching(/already/),
      });
    });
  });

  describe('listFiles and readFile', () => {
    const findSite = prisma.site.findUnique as ReturnType<typeof vi.fn>;
    const findBlobs = prisma.blob.findMany as ReturnType<typeof vi.fn>;
    const findPublishFiles = prisma.publishFile.findMany as ReturnType<
      typeof vi.fn
    >;
    const fetch = fetchFile as ReturnType<typeof vi.fn>;
    const at = new Date('2026-11-01T10:00:00.000Z');
    const blob = (path: string, size = 10) => ({
      path,
      size,
      sha: `sha-${path}`,
      updatedAt: at,
    });
    const NOT_FOUND = {
      status: 404,
      message:
        'Site not found among the sites you can edit. Use list-sites to see them.',
    };

    beforeEach(() => {
      findSite.mockResolvedValue({ userId: 'u1', plan: 'FREE', members: [] });
      findBlobs.mockResolvedValue([blob('index.md'), blob('about.md')]);
      findPublishFiles.mockResolvedValue([]);
    });

    it("lists the owner's files sorted by path, from that site only", async () => {
      const files = await realMcpDeps().listFiles('u1', 'site-1');
      expect(findSite).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'site-1' } }),
      );
      expect(findBlobs).toHaveBeenCalledWith(
        expect.objectContaining({ where: { siteId: 'site-1' } }),
      );
      expect(files).toEqual([
        { path: 'about.md', size: 10, updatedAt: at.toISOString() },
        { path: 'index.md', size: 10, updatedAt: at.toISOString() },
      ]);
    });

    it('leaves out a file a recent publish deleted (Blob row not yet removed)', async () => {
      findPublishFiles.mockResolvedValue([
        {
          path: 'about.md',
          status: 'success',
          changeType: 'deleted',
          publish: { startedAt: new Date(at.getTime() + 1000) },
        },
      ]);
      const files = await realMcpDeps().listFiles('u1', 'site-1');
      expect(files.map((f) => f.path)).toEqual(['index.md']);
    });

    it.each([
      ["another user's site", { userId: 'u2', plan: 'FREE', members: [] }],
      [
        'an anonymous site',
        { userId: ANONYMOUS_USER_ID, plan: 'FREE', members: [] },
      ],
      [
        'a site the user was removed from as editor',
        { userId: 'u2', plan: 'PREMIUM', members: [] },
      ],
      ['a missing site', null],
    ])('refuses %s with the same 404, reading nothing', async (_l, site) => {
      findSite.mockResolvedValue(site);
      await expect(
        realMcpDeps().listFiles('u1', 'site-1'),
      ).rejects.toMatchObject(NOT_FOUND);
      await expect(
        realMcpDeps().readFile('u1', 'site-1', 'index.md'),
      ).rejects.toMatchObject(NOT_FOUND);
      expect(findBlobs).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('lets a Premium editor list files', async () => {
      findSite.mockResolvedValue({
        userId: 'owner',
        plan: 'PREMIUM',
        members: [{ userId: 'u1' }],
      });
      await expect(
        realMcpDeps().listFiles('u1', 'site-1'),
      ).resolves.toHaveLength(2);
    });

    it('tells a lapsed editor the plan lapsed, not "not found"', async () => {
      findSite.mockResolvedValue({
        userId: 'owner',
        plan: 'FREE',
        members: [{ userId: 'u1' }],
      });
      await expect(
        realMcpDeps().readFile('u1', 'site-1', 'index.md'),
      ).rejects.toMatchObject({ status: 403, code: 'premium_required' });
      expect(findBlobs).not.toHaveBeenCalled();
    });

    it("reads a text file from the site's storage", async () => {
      fetch.mockResolvedValue('# Home');
      await expect(
        realMcpDeps().readFile('u1', 'site-1', 'index.md'),
      ).resolves.toBe('# Home');
      expect(fetch).toHaveBeenCalledWith({
        projectId: 'site-1',
        path: 'index.md',
      });
    });

    it('only reads paths the site has, never an arbitrary storage key', async () => {
      await expect(
        realMcpDeps().readFile('u1', 'site-1', '../site-2/main/raw/index.md'),
      ).rejects.toMatchObject({
        status: 404,
        message: expect.stringMatching(/list-files/),
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('refuses binary files and files over the size limit', async () => {
      findBlobs.mockResolvedValue([
        blob('logo.png'),
        blob('big.md', READ_FILE_MAX_BYTES + 1),
      ]);
      await expect(
        realMcpDeps().readFile('u1', 'site-1', 'logo.png'),
      ).rejects.toMatchObject({ status: 415 });
      await expect(
        realMcpDeps().readFile('u1', 'site-1', 'big.md'),
      ).rejects.toMatchObject({ status: 413 });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('reports a file missing from storage as not found', async () => {
      fetch.mockResolvedValue(null);
      await expect(
        realMcpDeps().readFile('u1', 'site-1', 'index.md'),
      ).rejects.toBeInstanceOf(ApiError);
    });
  });
  describe('listSites', () => {
    it('returns owned and Premium shared sites with role and owner', async () => {
      const findMany = prisma.site.findMany as ReturnType<typeof vi.fn>;
      findMany.mockResolvedValue([
        {
          id: 's1',
          userId: 'u1',
          projectName: 'notes',
          customDomain: null,
          subdomain: 'notes-alice',
          user: { username: 'alice' },
          publishes: [],
        },
        {
          id: 's2',
          userId: 'u2',
          projectName: 'notes',
          customDomain: null,
          subdomain: 'notes-bob',
          user: { username: 'bob' },
          publishes: [{ startedAt: new Date('2026-10-18T09:00:00.000Z') }],
        },
      ]);
      const sites = await realMcpDeps().listSites('u1');
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { userId: 'u1' },
              { members: { some: { userId: 'u1' } }, plan: 'PREMIUM' },
            ],
          },
        }),
      );
      expect(sites).toEqual([
        expect.objectContaining({
          siteId: 's1',
          role: 'owner',
          owner: 'alice',
          lastPublishedAt: null,
        }),
        expect.objectContaining({
          siteId: 's2',
          role: 'editor',
          owner: 'bob',
          lastPublishedAt: '2026-10-18T09:00:00.000Z',
        }),
      ]);
    });
  });
});
