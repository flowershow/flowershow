import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.me',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
    ANON_PUBLISH_DISABLED: undefined as string | undefined,
  },
}));
vi.mock('@/env.mjs', () => mockEnv);
vi.mock('@/server/db', () => ({
  default: { site: { create: vi.fn(), count: vi.fn() } },
}));
vi.mock('@/lib/typesense', () => ({ createSiteCollection: vi.fn() }));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn(),
  }),
}));

import { verifySiteClaimToken } from '@/lib/anonymous-user';
import prisma from '@/server/db';
import { POST } from './route';

const create = prisma.site.create as ReturnType<typeof vi.fn>;
const count = prisma.site.count as ReturnType<typeof vi.fn>;

function req() {
  return new NextRequest('http://localhost/api/sites/anon', {
    method: 'POST',
    body: '{}',
    headers: { 'x-forwarded-for': '9.9.9.9' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.env.ANON_PUBLISH_DISABLED = undefined;
  count.mockResolvedValue(0);
  create.mockImplementation(async ({ data }) => ({ id: 'site-1', ...data }));
});

describe('POST /api/sites/anon', () => {
  it('creates a temporary anonymous site and returns a claim token + URL', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = create.mock.calls[0]?.[0].data;
    expect(data.isTemporary).toBe(true);
    expect(data.anonCreatorIpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.siteId).toBe('site-1');
    expect(body.liveUrl).toBe(`https://${data.subdomain}.flowershow.me`);
    expect(verifySiteClaimToken(body.claimToken)).toEqual({
      siteId: 'site-1',
      anonymousUserId: data.anonymousOwnerId,
    });
    expect(body.claimUrl).toBe(
      `https://flowershow.app/claim?siteId=site-1#token=${body.claimToken}`,
    );
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(
      Date.now() + 6.9 * 24 * 3600 * 1000,
    );
  });

  it('returns 429 when the IP is over the limit, creating nothing', async () => {
    count.mockResolvedValue(10);
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 503 and creates nothing when anonymous publishing is disabled', async () => {
    mockEnv.env.ANON_PUBLISH_DISABLED = 'true';
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('anon_disabled');
    expect(create).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
