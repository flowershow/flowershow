import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  },
}));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/server/auth', () => ({ authOptions: {} }));
vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn(),
  }),
}));

import { getServerSession } from 'next-auth';
import {
  ANONYMOUS_USER_ID,
  generateOwnershipToken,
  generateSiteClaimToken,
} from '@/lib/anonymous-user';
import prisma from '@/server/db';
import { POST } from './route';

const findUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const count = prisma.site.count as ReturnType<typeof vi.fn>;
const update = prisma.site.update as ReturnType<typeof vi.fn>;
const session = getServerSession as ReturnType<typeof vi.fn>;

function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/sites/claim', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      origin: 'http://localhost',
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
      ...headers,
    },
  });
}

const anonSite = (over: Record<string, unknown> = {}) => ({
  id: 'site-1',
  projectName: 'p',
  userId: ANONYMOUS_USER_ID,
  anonymousOwnerId: 'anon-1',
  ...over,
});

const TRANSFER = {
  userId: 'u1',
  isTemporary: false,
  expiresAt: null,
  anonymousOwnerId: null,
  anonCreatorIpHash: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue({ user: { id: 'u1' } });
  count.mockResolvedValue(0);
  findUnique.mockResolvedValue(anonSite());
  update.mockImplementation(async ({ data }) => ({
    id: 'site-1',
    projectName: 'p',
    ...data,
  }));
});

describe('POST /api/sites/claim', () => {
  it('claims with a valid claimToken', async () => {
    const claimToken = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ siteId: 'site-1', claimToken }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: TRANSFER,
    });
  });

  it('rejects a claimToken for a different site with 403', async () => {
    const claimToken = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ siteId: 'site-2', claimToken }));
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a claimToken whose anonymousUserId does not match the site owner', async () => {
    const claimToken = generateSiteClaimToken('site-1', 'someone-else');
    const res = await POST(req({ siteId: 'site-1', claimToken }));
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a garbage claimToken with 403', async () => {
    const res = await POST(req({ siteId: 'site-1', claimToken: 'nope' }));
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 400 when the site is already claimed', async () => {
    findUnique.mockResolvedValue(anonSite({ userId: 'u2' }));
    const claimToken = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ siteId: 'site-1', claimToken }));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 410 for a claimToken whose temporary site has expired', async () => {
    findUnique.mockResolvedValue(
      anonSite({
        isTemporary: true,
        expiresAt: new Date(Date.now() - 1000),
      }),
    );
    const claimToken = `fs_claim_${jwt.sign(
      { type: 'site_claim', siteId: 'site-1', anonymousUserId: 'anon-1' },
      'test-secret',
      { expiresIn: -10 },
    )}`;
    const res = await POST(req({ siteId: 'site-1', claimToken }));
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe('This link has expired');
    expect(update).not.toHaveBeenCalled();
  });

  it('still accepts a legacy ownershipToken', async () => {
    const ownershipToken = generateOwnershipToken('anon-1');
    const res = await POST(req({ siteId: 'site-1', ownershipToken }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: TRANSFER,
    });
  });

  it('returns 400 when neither token is given', async () => {
    const res = await POST(req({ siteId: 'site-1' }));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 401 without a session', async () => {
    session.mockResolvedValue(null);
    const claimToken = generateSiteClaimToken('site-1', 'anon-1');
    const res = await POST(req({ siteId: 'site-1', claimToken }));
    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  describe('cross-site request protection', () => {
    const claimToken = () => generateSiteClaimToken('site-1', 'anon-1');

    it('rejects a request from another origin (e.g. a sibling subdomain) with 403', async () => {
      const res = await POST(
        req(
          { siteId: 'site-1', claimToken: claimToken() },
          {
            origin: 'https://r2.flowershow.app',
            'sec-fetch-site': 'same-site',
          },
        ),
      );
      expect(res.status).toBe(403);
      expect(update).not.toHaveBeenCalled();
    });

    it('rejects a request with no Origin header with 403', async () => {
      const r = req({ siteId: 'site-1', claimToken: claimToken() });
      r.headers.delete('origin');
      const res = await POST(r);
      expect(res.status).toBe(403);
      expect(update).not.toHaveBeenCalled();
    });

    it('rejects a matching Origin when Sec-Fetch-Site says cross-site', async () => {
      const res = await POST(
        req(
          { siteId: 'site-1', claimToken: claimToken() },
          { 'sec-fetch-site': 'cross-site' },
        ),
      );
      expect(res.status).toBe(403);
      expect(update).not.toHaveBeenCalled();
    });

    it('rejects a non-JSON content type (no-preflight simple request) with 415', async () => {
      const res = await POST(
        req(
          { siteId: 'site-1', claimToken: claimToken() },
          { 'content-type': 'text/plain;charset=UTF-8' },
        ),
      );
      expect(res.status).toBe(415);
      expect(update).not.toHaveBeenCalled();
    });

    it('accepts a same-origin request without Sec-Fetch-Site (older browsers)', async () => {
      const r = req({ siteId: 'site-1', claimToken: claimToken() });
      r.headers.delete('sec-fetch-site');
      const res = await POST(r);
      expect(res.status).toBe(200);
    });
  });
});
