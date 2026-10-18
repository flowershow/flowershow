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
  default: { site: { findUnique: vi.fn(), findMany: vi.fn() } },
}));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}));
vi.mock('./limits', () => ({
  checkAnonCreateLimits: vi.fn(async () => null),
  checkAnonUpdateLimit: vi.fn(async () => true),
  reportGlobalLimitReached: vi.fn(async () => {}),
  signInHint: () => 'Sign in: https://flowershow.app/api/mcp/account',
  MCP_ANON_LIMITS: { perCaller: 10, perIp: 10, perSiteUpdates: 60 },
}));

import { GET as statusGET } from '@/app/api/sites/id/[siteId]/status/route';
import { POST as syncPOST } from '@/app/api/sites/id/[siteId]/sync/route';
import { POST as createSitePOST } from '@/app/api/sites/route';
import { hashIp } from '@/lib/anon-rate-limit';
import { createAnonSite } from '@/lib/anon-site';
import { generateSiteClaimToken } from '@/lib/anonymous-user';
import { claimAnonSite } from '@/lib/claim-anon-site';
import prisma from '@/server/db';
import { MCP_ANON_BUCKET, realMcpDeps } from './deps';
import { mcpInternalCaller } from './internal-request';
import {
  checkAnonCreateLimits,
  checkAnonUpdateLimit,
  reportGlobalLimitReached,
} from './limits';
import { ApiError, PublishError } from './publish';

const create = createAnonSite as ReturnType<typeof vi.fn>;
const sync = syncPOST as ReturnType<typeof vi.fn>;
const status = statusGET as ReturnType<typeof vi.fn>;
const createSite = createSitePOST as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.env.MCP_ANON_HOURLY_LIMIT = undefined;
});

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

  it('alerts and points at the signed-in connector when the global bucket runs out', async () => {
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
    expect(err.message).toContain('https://flowershow.app/api/mcp/account');
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
    expect(err.message).toContain('https://flowershow.app/api/mcp/account');
    expect(create).not.toHaveBeenCalled();
  });

  it('limits publishes to an anonymous site per site', async () => {
    const token = generateSiteClaimToken('site-1', 'anon-1');
    vi.mocked(checkAnonUpdateLimit).mockResolvedValueOnce(false);
    const err = await realMcpDeps()
      .sync('site-1', [], { claimToken: token })
      .catch((e) => e);
    expect(checkAnonUpdateLimit).toHaveBeenCalledWith('site-1');
    expect(err).toBeInstanceOf(PublishError);
    expect(sync).not.toHaveBeenCalled();
  });

  it("does not count a claim token for another site against this site's limit", async () => {
    sync.mockResolvedValue(NextResponse.json({ toUpload: [], toUpdate: [] }));
    const token = generateSiteClaimToken('site-other', 'anon-1');
    await realMcpDeps().sync('site-1', [], { claimToken: token });
    await realMcpDeps().sync('site-1', [], { userId: 'u1' });
    expect(checkAnonUpdateLimit).not.toHaveBeenCalled();
  });

  it('calls the sync route in-process with the claim token and file list', async () => {
    sync.mockResolvedValue(NextResponse.json({ toUpload: [], toUpdate: [] }));
    const files = [{ path: 'a.md', size: 1, sha: 'x' }];
    await realMcpDeps().sync('site-1', files, { claimToken: 'fs_claim_t' });
    const [req, ctx] = sync.mock.calls[0] ?? [];
    expect(req.headers.get('authorization')).toBe('Bearer fs_claim_t');
    expect(mcpInternalCaller(req)).toEqual({});
    expect(await req.json()).toEqual({ files });
    expect(await ctx.params).toEqual({ siteId: 'site-1' });
  });

  it('acts for a signed-in user with the in-process marker, never forwarding a bearer', async () => {
    sync.mockResolvedValue(NextResponse.json({ toUpload: [], toUpdate: [] }));
    await realMcpDeps().sync('site-1', [], { userId: 'u1' });
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
      .sync('site-1', [], { claimToken: 'fs_claim_t' })
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
});
