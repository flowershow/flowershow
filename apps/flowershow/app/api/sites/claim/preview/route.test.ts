import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.me',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  },
}));
vi.mock('@/server/db', () => ({
  default: { site: { findUnique: vi.fn() } },
}));

import {
  ANONYMOUS_USER_ID,
  generateSiteClaimToken,
} from '@/lib/anonymous-user';
import prisma from '@/server/db';
import { POST } from './route';

const findUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>;

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/sites/claim/preview', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

const expiresAt = new Date(Date.now() + 86400000);
const anonSite = {
  id: 'site-1',
  projectName: 'abcd1234-anon',
  customDomain: null,
  subdomain: 'abcd1234-anon',
  userId: ANONYMOUS_USER_ID,
  anonymousOwnerId: 'anon-1',
  isTemporary: true,
  expiresAt,
  user: { username: 'anon' },
};
const token = () => generateSiteClaimToken('site-1', 'anon-1');

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue(anonSite);
});

describe('POST /api/sites/claim/preview', () => {
  it('returns the live URL and expiry for the token holder', async () => {
    const res = await POST(req({ siteId: 'site-1', claimToken: token() }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      siteId: 'site-1',
      projectName: 'abcd1234-anon',
      liveUrl: 'https://abcd1234-anon.flowershow.me',
      expiresAt: expiresAt.toISOString(),
    });
  });

  it('refuses a token for another site without touching the database', async () => {
    const res = await POST(req({ siteId: 'other', claimToken: token() }));
    expect(res.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('refuses a token from another anonymous owner', async () => {
    findUnique.mockResolvedValue({ ...anonSite, anonymousOwnerId: 'anon-2' });
    const res = await POST(req({ siteId: 'site-1', claimToken: token() }));
    expect(res.status).toBe(403);
  });

  it('reports a claimed site as 409', async () => {
    findUnique.mockResolvedValue({ ...anonSite, userId: 'u1' });
    const res = await POST(req({ siteId: 'site-1', claimToken: token() }));
    expect(res.status).toBe(409);
  });

  it('reports an expired site as 410', async () => {
    findUnique.mockResolvedValue({
      ...anonSite,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(req({ siteId: 'site-1', claimToken: token() }));
    expect(res.status).toBe(410);
  });

  it('requires siteId and claimToken', async () => {
    const res = await POST(req({ siteId: 'site-1' }));
    expect(res.status).toBe(400);
  });
});
