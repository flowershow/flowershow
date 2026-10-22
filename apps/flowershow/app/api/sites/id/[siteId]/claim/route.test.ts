import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.me',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  },
}));
vi.mock('@/lib/cli-auth', () => ({
  checkCliVersion: () => null,
  validateAccessToken: vi.fn(),
}));
vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn(),
  }),
}));

import {
  ANONYMOUS_USER_ID,
  generateSiteClaimToken,
} from '@/lib/anonymous-user';
import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';
import { POST } from './route';

const findUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const updateMany = prisma.site.updateMany as ReturnType<typeof vi.fn>;
const validate = validateAccessToken as ReturnType<typeof vi.fn>;

const params = (siteId = 'site-1') => ({
  params: Promise.resolve({ siteId }),
});
function req(body: unknown) {
  return new NextRequest('http://localhost/api/sites/id/site-1/claim', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      authorization: 'Bearer fs_cli_x',
      'content-type': 'application/json',
    },
  });
}

const anonRow = {
  userId: ANONYMOUS_USER_ID,
  anonymousOwnerId: 'anon-1',
  isTemporary: true,
  expiresAt: new Date(Date.now() + 86400000),
};
const claimedRow = {
  id: 'site-1',
  projectName: 'abcd1234-anon',
  customDomain: null,
  subdomain: 'abcd1234-anon',
  user: { username: 'alice' },
};

beforeEach(() => {
  vi.clearAllMocks();
  validate.mockResolvedValue({ userId: 'u1' });
  updateMany.mockResolvedValue({ count: 1 });
});

describe('POST /api/sites/id/:siteId/claim', () => {
  it('claims the site into the token owner account and returns its URL', async () => {
    findUnique
      .mockResolvedValueOnce(anonRow)
      .mockResolvedValueOnce({ id: 'site-1', projectName: 'p', userId: 'u1' })
      .mockResolvedValueOnce(claimedRow);
    const token = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ claimToken: token }), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      site: {
        id: 'site-1',
        projectName: 'abcd1234-anon',
        url: 'https://abcd1234-anon.flowershow.me',
      },
      alreadyClaimed: false,
    });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', isTemporary: false }),
      }),
    );
  });

  it('requires a user token', async () => {
    validate.mockResolvedValue(null);
    const token = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ claimToken: token }), params());
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('requires a claim token', async () => {
    const res = await POST(req({}), params());
    expect(res.status).toBe(400);
  });

  it('refuses a token for another site without touching the database', async () => {
    const token = generateSiteClaimToken('other-site', 'anon-1');
    const res = await POST(req({ claimToken: token }), params());
    expect(res.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('succeeds idempotently when the site is already in this account', async () => {
    findUnique
      .mockResolvedValueOnce({
        ...anonRow,
        userId: 'u1',
        anonymousOwnerId: null,
      })
      .mockResolvedValueOnce({ userId: 'u1' })
      .mockResolvedValueOnce(claimedRow);
    const token = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ claimToken: token }), params());
    expect(res.status).toBe(200);
    expect((await res.json()).alreadyClaimed).toBe(true);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('returns 409 when the site was claimed into another account', async () => {
    findUnique
      .mockResolvedValueOnce({
        ...anonRow,
        userId: 'u2',
        anonymousOwnerId: null,
      })
      .mockResolvedValueOnce({ userId: 'u2' });
    const token = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ claimToken: token }), params());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('claimed');
  });

  it('returns 410 for an expired site', async () => {
    findUnique.mockResolvedValueOnce({
      ...anonRow,
      expiresAt: new Date(Date.now() - 1000),
    });
    const token = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ claimToken: token }), params());
    expect(res.status).toBe(410);
  });

  it('returns 404 for a deleted site', async () => {
    findUnique.mockResolvedValueOnce(null);
    const token = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ claimToken: token }), params());
    expect(res.status).toBe(404);
  });
});
