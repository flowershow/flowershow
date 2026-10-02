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
vi.mock('@/server/db', () => ({
  default: { site: { findUnique: vi.fn(), findMany: vi.fn() } },
}));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}));

import { GET as statusGET } from '@/app/api/sites/id/[siteId]/status/route';
import { POST as syncPOST } from '@/app/api/sites/id/[siteId]/sync/route';
import { hashIp } from '@/lib/anon-rate-limit';
import { createAnonSite } from '@/lib/anon-site';
import { MCP_ANON_BUCKET, realMcpDeps } from './deps';
import { ApiError } from './publish';

const create = createAnonSite as ReturnType<typeof vi.fn>;
const sync = syncPOST as ReturnType<typeof vi.fn>;
const status = statusGET as ReturnType<typeof vi.fn>;

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
      status: 429,
      error: 'rate_limited',
      message: 'slow down',
    });
    await expect(realMcpDeps().createAnonSite()).rejects.toMatchObject({
      status: 429,
      message: 'slow down',
    });
  });

  it('calls the sync route in-process with the bearer token and file list', async () => {
    sync.mockResolvedValue(NextResponse.json({ toUpload: [], toUpdate: [] }));
    const files = [{ path: 'a.md', size: 1, sha: 'x' }];
    await realMcpDeps().sync('site-1', files, 'fs_claim_t');
    const [req, ctx] = sync.mock.calls[0] ?? [];
    expect(req.headers.get('authorization')).toBe('Bearer fs_claim_t');
    expect(await req.json()).toEqual({ files });
    expect(await ctx.params).toEqual({ siteId: 'site-1' });
  });

  it('maps a sync error response to ApiError with its status', async () => {
    sync.mockResolvedValue(
      NextResponse.json({ error: 'claimed', message: 'm' }, { status: 409 }),
    );
    const err = await realMcpDeps()
      .sync('site-1', [], 'fs_claim_t')
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'claimed' });
  });

  it('polls status in-process with the bearer token', async () => {
    status.mockResolvedValue(NextResponse.json({ status: 'complete' }));
    expect(await realMcpDeps().status('site-1', 'fs_claim_t')).toEqual({
      status: 'complete',
    });
    expect(status.mock.calls[0]?.[0].headers.get('authorization')).toBe(
      'Bearer fs_claim_t',
    );
  });
});
