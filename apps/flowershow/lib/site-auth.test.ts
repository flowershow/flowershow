import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({ env: { ANONYMOUS_JWT_SECRET: 'test-secret' } }));
vi.mock('@/server/db', () => ({ default: { site: { findUnique: vi.fn() } } }));
vi.mock('@/lib/cli-auth', () => ({ validateAccessToken: vi.fn() }));

import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';
import { ANONYMOUS_USER_ID, generateSiteClaimToken } from './anonymous-user';
import { authorizeSiteRequest } from './site-auth';

const findUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const validate = validateAccessToken as ReturnType<typeof vi.fn>;
const ANON = '3f1c2b7a-1d2e-4f3a-9b4c-5d6e7f8a9b0c';
const future = new Date(Date.now() + 86400000);

function req(token?: string) {
  return new NextRequest('http://localhost/api/sites/id/site-1/sync', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  validate.mockResolvedValue(null);
});

describe('authorizeSiteRequest', () => {
  it('accepts the owner user token', async () => {
    validate.mockResolvedValue({ userId: 'u1' });
    findUnique.mockResolvedValue({ id: 'site-1', userId: 'u1' });
    const r = await authorizeSiteRequest(req('fs_pat_x'), 'site-1');
    expect(r).toEqual({ ok: true, kind: 'user', userId: 'u1' });
  });

  it('accepts a claim token for its own anonymous, unexpired site', async () => {
    findUnique.mockResolvedValue({
      id: 'site-1',
      userId: ANONYMOUS_USER_ID,
      anonymousOwnerId: ANON,
      expiresAt: future,
    });
    const r = await authorizeSiteRequest(
      req(generateSiteClaimToken('site-1', ANON)),
      'site-1',
    );
    expect(r).toEqual({ ok: true, kind: 'anon', siteId: 'site-1' });
  });

  it('rejects a claim token for a different site (403)', async () => {
    findUnique.mockResolvedValue({
      id: 'site-2',
      userId: ANONYMOUS_USER_ID,
      anonymousOwnerId: ANON,
      expiresAt: future,
    });
    const r = await authorizeSiteRequest(
      req(generateSiteClaimToken('site-1', ANON)),
      'site-2',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it('rejects a claim token once the site has been claimed (403)', async () => {
    findUnique.mockResolvedValue({
      id: 'site-1',
      userId: 'u1',
      anonymousOwnerId: null,
      expiresAt: null,
    });
    const r = await authorizeSiteRequest(
      req(generateSiteClaimToken('site-1', ANON)),
      'site-1',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it('returns 410 for an expired anonymous site', async () => {
    findUnique.mockResolvedValue({
      id: 'site-1',
      userId: ANONYMOUS_USER_ID,
      anonymousOwnerId: ANON,
      expiresAt: new Date(Date.now() - 1000),
    });
    const r = await authorizeSiteRequest(
      req(generateSiteClaimToken('site-1', ANON)),
      'site-1',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(410);
  });

  it('treats an anonymous site without an expiry as expired (410, fail closed)', async () => {
    findUnique.mockResolvedValue({
      id: 'site-1',
      userId: ANONYMOUS_USER_ID,
      anonymousOwnerId: ANON,
      expiresAt: null,
    });
    const r = await authorizeSiteRequest(
      req(generateSiteClaimToken('site-1', ANON)),
      'site-1',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(410);
  });

  it('returns 401 with no token and 404 for a missing site', async () => {
    let r = await authorizeSiteRequest(req(), 'site-1');
    expect(!r.ok && r.response.status).toBe(401);
    findUnique.mockResolvedValue(null);
    r = await authorizeSiteRequest(
      req(generateSiteClaimToken('site-1', ANON)),
      'site-1',
    );
    expect(!r.ok && r.response.status).toBe(404);
  });
});
