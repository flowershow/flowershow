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
const db = vi.hoisted(() => {
  const calls: string[] = [];
  const tx = {
    $executeRaw: vi.fn(async () => {
      calls.push('lock');
      return 1;
    }),
    site: {
      count: vi.fn(async () => {
        calls.push('count');
        return 0;
      }),
      create: vi.fn(async ({ data }) => {
        calls.push('create');
        return { id: 'site-1', ...data };
      }),
    },
  };
  return {
    calls,
    tx,
    prisma: {
      ...tx,
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => {
        calls.push('begin');
        const r = await fn(tx);
        calls.push('commit');
        return r;
      }),
    },
  };
});
vi.mock('@/server/db', () => ({ default: db.prisma }));
vi.mock('@/lib/typesense', () => ({ createSiteCollection: vi.fn() }));

import { createAnonSite } from './anon-site';

beforeEach(() => {
  vi.clearAllMocks();
  db.calls.length = 0;
  mockEnv.env.ANON_PUBLISH_DISABLED = undefined;
});

describe('createAnonSite', () => {
  it('locks the bucket, then counts and creates inside one transaction', async () => {
    const r = await createAnonSite({ bucket: 'b', rateLimitedMessage: 'm' });
    expect(r.ok).toBe(true);
    expect(db.calls).toEqual(['begin', 'lock', 'count', 'create', 'commit']);
  });

  it('refuses when the bucket is full, creating nothing', async () => {
    db.tx.site.count.mockResolvedValueOnce(5);
    const r = await createAnonSite({
      bucket: 'b',
      limit: 5,
      rateLimitedMessage: 'slow down',
    });
    expect(r).toEqual({
      ok: false,
      status: 429,
      error: 'rate_limited',
      message: 'slow down',
    });
    expect(db.tx.site.create).not.toHaveBeenCalled();
  });

  it('a limit of 0 disables creation for that bucket', async () => {
    db.tx.site.count.mockResolvedValueOnce(0);
    const r = await createAnonSite({
      bucket: 'b',
      limit: 0,
      rateLimitedMessage: 'm',
    });
    expect(r.ok).toBe(false);
  });

  it('honours the kill switch before touching the database', async () => {
    mockEnv.env.ANON_PUBLISH_DISABLED = 'true';
    const r = await createAnonSite({ bucket: 'b', rateLimitedMessage: 'm' });
    expect(r).toMatchObject({ ok: false, status: 503, error: 'anon_disabled' });
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });
});
