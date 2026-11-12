import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));

import {
  cardPeople,
  getPeopleBySite,
  loadBlobCountsBySite,
} from './people-by-site';
import type { UmamiClient } from './umami-client';

const now = new Date('2026-12-20T15:00:00Z');

const rows = (prefix: string, n: number, start = 0) =>
  Array.from({ length: n }, (_, i) => ({
    name: `${prefix}${start + i}`,
    pageviews: 10,
    visitors: start + i + 1,
  }));

const fakeClient = (metrics: ReturnType<typeof vi.fn>) =>
  ({ metrics }) as unknown as UmamiClient;

describe('getPeopleBySite', () => {
  it('pages through tags until a short page and finds a site on page 2', async () => {
    const metrics = vi
      .fn()
      .mockResolvedValueOnce(rows('s', 500))
      .mockResolvedValueOnce(rows('s', 3, 500));
    const out = await getPeopleBySite(['s0', 's501'], {
      client: fakeClient(metrics),
      now,
    });
    expect(metrics).toHaveBeenCalledTimes(2);
    expect(metrics.mock.calls[0]![0]).toMatchObject({
      type: 'tag',
      limit: 500,
      offset: 0,
    });
    expect(metrics.mock.calls[1]![0]).toMatchObject({
      type: 'tag',
      limit: 500,
      offset: 500,
    });
    expect(out).toEqual({ s0: 1, s501: 502 });
  });

  it('maps listed sites without a row to 0 and leaves out others', async () => {
    const metrics = vi.fn().mockResolvedValueOnce(rows('s', 2));
    const out = await getPeopleBySite(['s1', 'missing'], {
      client: fakeClient(metrics),
      now,
    });
    expect(out).toEqual({ s1: 2, missing: 0 });
    expect(out).not.toHaveProperty('s0');
  });

  it('uses the last 30 UTC days', async () => {
    const metrics = vi.fn().mockResolvedValueOnce([]);
    await getPeopleBySite(['a'], { client: fakeClient(metrics), now });
    const w = metrics.mock.calls[0]![0];
    expect(new Date(w.startAt).toISOString()).toBe('2026-11-21T00:00:00.000Z');
    expect(w.endAt).toBe(now.getTime());
  });

  it('returns null when a call rejects', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const metrics = vi.fn().mockRejectedValue(new Error('boom'));
    expect(
      await getPeopleBySite(['a'], { client: fakeClient(metrics), now }),
    ).toBeNull();
    spy.mockRestore();
  });

  it('returns null when there is no client', async () => {
    expect(await getPeopleBySite(['a'], { client: null, now })).toBeNull();
  });
});

describe('cardPeople', () => {
  const pub = { id: 's1', privacyMode: 'PUBLIC' };
  const people = { s1: 7 };
  it('shows the number for a normal site', () => {
    expect(cardPeople(pub, { pages: 3, rawHtml: 1 }, people)).toBe(7);
  });
  it('shows nothing for a password-protected site', () => {
    expect(
      cardPeople(
        { id: 's1', privacyMode: 'PASSWORD' },
        { pages: 3, rawHtml: 0 },
        people,
      ),
    ).toBeUndefined();
  });
  it('shows nothing for an html-only site', () => {
    expect(cardPeople(pub, { pages: 0, rawHtml: 2 }, people)).toBeUndefined();
  });
  it('shows nothing when numbers are unavailable', () => {
    expect(cardPeople(pub, { pages: 3, rawHtml: 0 }, null)).toBeUndefined();
  });
  it('treats a site with no counts as counted', () => {
    expect(cardPeople(pub, undefined, people)).toBe(7);
  });
});

describe('loadBlobCountsBySite', () => {
  it('groups page and raw-HTML counts by site, excluding site chrome', async () => {
    const groupBy = vi
      .fn()
      .mockResolvedValueOnce([
        { siteId: 'a', _count: { _all: 4 } },
        { siteId: 'b', _count: { _all: 0 } },
      ])
      .mockResolvedValueOnce([{ siteId: 'b', _count: { _all: 2 } }]);
    const out = await loadBlobCountsBySite(['a', 'b', 'c'], {
      blob: { groupBy },
    });
    expect(groupBy).toHaveBeenCalledTimes(2);
    expect(groupBy.mock.calls[0]![0].where).toMatchObject({
      siteId: { in: ['a', 'b', 'c'] },
      appPath: { not: null },
    });
    expect(groupBy.mock.calls[1]![0].where.path).toMatchObject({
      endsWith: '.html',
      notIn: ['_footer.html', '_navbar.html'],
    });
    expect(out).toEqual({
      a: { pages: 4, rawHtml: 0 },
      b: { pages: 0, rawHtml: 2 },
      c: { pages: 0, rawHtml: 0 },
    });
  });
  it('returns {} when the db fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const groupBy = vi.fn().mockRejectedValue(new Error('db'));
    expect(await loadBlobCountsBySite(['a'], { blob: { groupBy } })).toEqual(
      {},
    );
    spy.mockRestore();
  });
});
