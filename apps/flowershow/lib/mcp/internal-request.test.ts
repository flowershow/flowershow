import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({
  default: {
    accessToken: { findFirst: vi.fn(), update: vi.fn() },
    site: { findUnique: vi.fn() },
  },
}));

import { validateAccessToken } from '@/lib/cli-auth';
import { authorizeSiteRequest } from '@/lib/site-auth';
import prisma from '@/server/db';
import { markMcpInternal, mcpInternalCaller } from './internal-request';

const findToken = prisma.accessToken.findFirst as ReturnType<typeof vi.fn>;
const findSite = prisma.site.findUnique as ReturnType<typeof vi.fn>;

const req = (headers: Record<string, string> = {}) =>
  new NextRequest('https://flowershow.app/api/sites/id/s1/sync', {
    method: 'POST',
    headers,
  });

beforeEach(() => {
  vi.clearAllMocks();
  findToken.mockResolvedValue(null);
});

describe('REST auth and OAuth tokens', () => {
  it('REST routes never accept OAuth access or refresh tokens', async () => {
    for (const t of ['fs_oat_abc', 'fs_ort_abc']) {
      expect(
        await validateAccessToken(req({ authorization: `Bearer ${t}` })),
      ).toBeNull();
    }
    expect(findToken).not.toHaveBeenCalled();
  });

  it('a site route refuses an OAuth token', async () => {
    const r = await authorizeSiteRequest(
      req({ authorization: 'Bearer fs_oat_abc' }),
      's1',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });
});

describe('in-process MCP marker', () => {
  it('lets the MCP endpoint act as an already-authenticated user', async () => {
    const r = markMcpInternal(req(), { userId: 'u1' });
    expect(await validateAccessToken(r)).toEqual({ userId: 'u1' });
    expect(findToken).not.toHaveBeenCalled();
  });

  it('still enforces site ownership', async () => {
    findSite.mockResolvedValue({ id: 's1', userId: 'someone-else' });
    const r = await authorizeSiteRequest(
      markMcpInternal(req(), { userId: 'u1' }),
      's1',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);

    findSite.mockResolvedValue({ id: 's1', userId: 'u1' });
    expect(
      await authorizeSiteRequest(
        markMcpInternal(req(), { userId: 'u1' }),
        's1',
      ),
    ).toEqual({ ok: true, kind: 'user', userId: 'u1' });
  });

  it('cannot be set from the network (headers, or a header named like it)', async () => {
    const r = req({
      'flowershow.mcp-internal': 'u1',
      'x-mcp-internal': '{"userId":"u1"}',
    });
    expect(mcpInternalCaller(r)).toBeUndefined();
    expect(await validateAccessToken(r)).toBeNull();
  });

  it('a marker without a user (anonymous MCP call) grants nothing', async () => {
    const r = markMcpInternal(req(), {});
    expect(await validateAccessToken(r)).toBeNull();
  });

  it('is read-only once set', () => {
    const r = markMcpInternal(req(), { userId: 'u1' });
    expect(() => markMcpInternal(r, { userId: 'u2' })).toThrow();
    expect(mcpInternalCaller(r)).toEqual({ userId: 'u1' });
  });
});
