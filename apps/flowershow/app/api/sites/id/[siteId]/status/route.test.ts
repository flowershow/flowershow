import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  // Anonymous public caller (no token) — the branch that could leak paths.
  validateAccessToken: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn() },
    publish: { findFirst: vi.fn() },
    publishFile: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  }),
}));

import {
  ANONYMOUS_USER_ID,
  generateSiteClaimToken,
} from '@/lib/anonymous-user';
import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';
import { GET } from './route';

const findUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const publishFindFirst = prisma.publish.findFirst as ReturnType<typeof vi.fn>;
const publishFileFindMany = prisma.publishFile.findMany as ReturnType<
  typeof vi.fn
>;

function makeReq(token?: string): NextRequest {
  return new NextRequest('http://localhost/api/sites/id/site-1/status', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function makeParams() {
  return { params: Promise.resolve({ siteId: 'site-1' }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  publishFindFirst.mockResolvedValue({ id: 'pub-1', legacy: false });
  // A failed publish whose file paths must not leak on a PASSWORD site.
  publishFileFindMany.mockResolvedValue([
    { id: 'f1', path: 'secret/notes.md', status: 'error', error: 'boom' },
  ]);
});

describe('GET /api/sites/id/:siteId/status — anonymous error branch', () => {
  it('hides failing file paths for a PASSWORD site (coarse status only)', async () => {
    findUnique.mockResolvedValue({
      id: 'site-1',
      userId: 'owner-1',
      privacyMode: 'PASSWORD',
    });

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'error' });
    expect(body).not.toHaveProperty('errors');
  });

  it('exposes failing file paths for a public site', async () => {
    findUnique.mockResolvedValue({
      id: 'site-1',
      userId: 'owner-1',
      privacyMode: 'PUBLIC',
    });

    const res = await GET(makeReq(), makeParams());

    const body = await res.json();
    expect(body.status).toBe('error');
    expect(body.errors).toEqual([{ path: 'secret/notes.md', error: 'boom' }]);
  });
});

describe('GET /api/sites/id/:siteId/status — claim token', () => {
  const ANON_OWNER = '3f1c2b7a-1d2e-4f3a-9b4c-5d6e7f8a9b0c';
  const anonSite = {
    id: 'site-1',
    userId: ANONYMOUS_USER_ID,
    anonymousOwnerId: ANON_OWNER,
    expiresAt: new Date(Date.now() + 86400000),
    privacyMode: 'PUBLIC',
  };

  it('returns the detailed status for its own anonymous site', async () => {
    findUnique.mockResolvedValue(anonSite);

    const res = await GET(
      makeReq(generateSiteClaimToken('site-1', ANON_OWNER)),
      makeParams(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.siteId).toBe('site-1');
    expect(body.status).toBe('error');
    expect(body.files).toEqual({ total: 1, pending: 0, success: 0, failed: 1 });
    expect(body.blobs).toHaveLength(1);
    expect(validateAccessToken).not.toHaveBeenCalled();
  });

  it('returns 403 for a claim token issued for a different site', async () => {
    findUnique.mockResolvedValue(anonSite);

    const res = await GET(
      makeReq(generateSiteClaimToken('site-2', ANON_OWNER)),
      makeParams(),
    );

    expect(res.status).toBe(403);
    expect(publishFindFirst).not.toHaveBeenCalled();
  });

  it('returns 410 for an expired anonymous site', async () => {
    findUnique.mockResolvedValue({
      ...anonSite,
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await GET(
      makeReq(generateSiteClaimToken('site-1', ANON_OWNER)),
      makeParams(),
    );

    expect(res.status).toBe(410);
  });

  it('keeps the public response when no token is sent', async () => {
    findUnique.mockResolvedValue(anonSite);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty('siteId');
    expect(body.status).toBe('error');
  });
});
