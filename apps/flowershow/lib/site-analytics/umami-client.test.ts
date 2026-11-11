import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
  config: { UMAMI_HOST: '', UMAMI_WEBSITE_ID: '' },
}));

vi.mock('@/env.mjs', () => ({ env: mocks.env }));
vi.mock('./config', async (orig) => ({
  ...(await orig<typeof import('./config')>()),
  get UMAMI_HOST() {
    return mocks.config.UMAMI_HOST;
  },
  get UMAMI_WEBSITE_ID() {
    return mocks.config.UMAMI_WEBSITE_ID;
  },
}));

import { createHttpUmamiClient, getUmamiClient } from './umami-client';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

const make = (fetchImpl: unknown, timeoutMs?: number) =>
  createHttpUmamiClient({
    host: 'https://umami.test',
    websiteId: 'site-1',
    apiKey: 'k',
    fetchImpl: fetchImpl as typeof fetch,
    timeoutMs,
  });

describe('createHttpUmamiClient', () => {
  it('stats calls /stats with the key and returns pageviews and visitors', async () => {
    const fetchImpl = vi.fn(async (..._args: any[]) =>
      json({ pageviews: 12, visitors: 5, visits: 6, bounces: 1, totaltime: 9 }),
    );
    const out = await make(fetchImpl).stats({
      startAt: 1000,
      endAt: 2000,
      tag: 'site:abc',
    });
    expect(out).toEqual({ pageviews: 12, visitors: 5 });
    const [url, init] = fetchImpl.mock.calls[0]!;
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe(
      'https://umami.test/api/websites/site-1/stats',
    );
    expect(u.searchParams.get('startAt')).toBe('1000');
    expect(u.searchParams.get('endAt')).toBe('2000');
    expect(u.searchParams.get('tag')).toBe('site:abc');
    expect(init.headers['x-umami-api-key']).toBe('k');
    expect(init.headers.Authorization).toBe('Bearer k');
  });

  it('omits tag when not given', async () => {
    const fetchImpl = vi.fn(async (..._args: any[]) =>
      json({ pageviews: 0, visitors: 0 }),
    );
    await make(fetchImpl).stats({ startAt: 1, endAt: 2 });
    const u = new URL(fetchImpl.mock.calls[0]![0]);
    expect(u.searchParams.has('tag')).toBe(false);
  });

  it('pageviewsByDay maps x/y to date/pageviews', async () => {
    const fetchImpl = vi.fn(async (..._args: any[]) =>
      json({ pageviews: [{ x: '2026-11-01 00:00:00', y: 3 }], sessions: [] }),
    );
    const out = await make(fetchImpl).pageviewsByDay({ startAt: 1, endAt: 2 });
    expect(out).toEqual([{ date: '2026-11-01', pageviews: 3 }]);
    const u = new URL(fetchImpl.mock.calls[0]![0]);
    expect(u.pathname).toBe('/api/websites/site-1/pageviews');
    expect(u.searchParams.get('unit')).toBe('day');
    expect(u.searchParams.get('timezone')).toBe('UTC');
  });

  it('metrics calls /metrics/expanded and keeps name, pageviews, visitors', async () => {
    const fetchImpl = vi.fn(async (..._args: any[]) =>
      json([
        {
          name: '/',
          pageviews: 4,
          visitors: 2,
          visits: 3,
          bounces: 0,
          totaltime: 1,
        },
      ]),
    );
    const out = await make(fetchImpl).metrics({
      startAt: 1,
      endAt: 2,
      type: 'path',
      limit: 500,
    });
    expect(out).toEqual([{ name: '/', pageviews: 4, visitors: 2 }]);
    const u = new URL(fetchImpl.mock.calls[0]![0]);
    expect(u.pathname).toBe('/api/websites/site-1/metrics/expanded');
    expect(u.searchParams.get('type')).toBe('path');
    expect(u.searchParams.get('limit')).toBe('500');
    expect(u.searchParams.get('offset')).toBe('0');
  });

  it('rejects on a non-2xx response', async () => {
    const fetchImpl = vi.fn(async (..._args: any[]) =>
      json({}, { status: 500 }),
    );
    await expect(
      make(fetchImpl).stats({ startAt: 1, endAt: 2 }),
    ).rejects.toThrow(/500/);
  });

  it('rejects when the response is slower than timeoutMs', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal!.addEventListener('abort', () =>
            rej(init.signal!.reason),
          );
        }),
    );
    await expect(
      make(fetchImpl, 20).stats({ startAt: 1, endAt: 2 }),
    ).rejects.toBeDefined();
  });
});

describe('getUmamiClient', () => {
  beforeEach(() => {
    for (const k of Object.keys(mocks.env)) delete mocks.env[k];
    mocks.config.UMAMI_HOST = '';
    mocks.config.UMAMI_WEBSITE_ID = '';
  });

  it.each(['production', 'preview'])(
    'returns null in %s when the key or constants are empty',
    (vercelEnv) => {
      mocks.env.NEXT_PUBLIC_VERCEL_ENV = vercelEnv;
      expect(getUmamiClient()).toBeNull();
      mocks.env.UMAMI_API_KEY = 'k';
      expect(getUmamiClient()).toBeNull();
    },
  );

  it('returns a client in production when fully configured', () => {
    mocks.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    mocks.env.UMAMI_API_KEY = 'k';
    mocks.config.UMAMI_HOST = 'https://umami.test';
    mocks.config.UMAMI_WEBSITE_ID = 'site-1';
    expect(getUmamiClient()).not.toBeNull();
  });

  it('returns the fixture client locally with no key', async () => {
    const client = getUmamiClient()!;
    expect(client).not.toBeNull();
    const s = await client.stats({ startAt: 1, endAt: 2, tag: 'x' });
    expect(s.pageviews).toBeGreaterThan(0);
  });
});
