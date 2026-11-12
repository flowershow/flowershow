import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));

import {
  attachTitles,
  getSiteAnalytics,
  loadSiteCountability,
  rangeWindow,
  siteCountability,
} from './site-analytics';
import type { UmamiClient } from './umami-client';

const now = new Date('2026-12-20T15:00:00Z');

describe('rangeWindow', () => {
  it('starts 30 days including today at 00:00 UTC', () => {
    const w = rangeWindow(30, now, new Date('2026-01-01T00:00:00Z'));
    expect(new Date(w.startAt).toISOString()).toBe('2026-11-21T00:00:00.000Z');
    expect(w.chartStart).toBe('2026-11-21');
    expect(w.endAt).toBe(now.getTime());
  });
  it('moves to the site creation day when later', () => {
    const w = rangeWindow(30, now, new Date('2026-12-15T10:00:00Z'));
    expect(new Date(w.startAt).toISOString()).toBe('2026-12-15T00:00:00.000Z');
    expect(w.chartStart).toBe('2026-12-15');
    expect(w.countingSince).toBe('2026-12-15');
  });
  it('uses the launch date when later than the range start', () => {
    const w = rangeWindow(
      30,
      new Date('2026-11-15T12:00:00Z'),
      new Date('2026-01-01T00:00:00Z'),
    );
    expect(w.chartStart).toBe('2026-11-12');
    expect(w.countingSince).toBe('2026-11-12');
  });
  it('keeps countingSince fixed for an old site 60 days after launch', () => {
    const later = new Date('2027-01-10T12:00:00Z');
    const created = new Date('2026-01-01T00:00:00Z');
    const w30 = rangeWindow(30, later, created);
    const w7 = rangeWindow(7, later, created);
    expect(w30.chartStart).toBe('2026-12-12');
    expect(w7.chartStart).toBe('2027-01-04');
    expect(w30.countingSince).toBe('2026-11-12');
    expect(w7.countingSince).toBe('2026-11-12');
  });
});

describe('attachTitles', () => {
  const pages = [
    { appPath: '/', permalink: null, title: 'Home' },
    { appPath: '/blog/a', permalink: '/my-link', title: 'A post' },
  ];
  const rows = [
    { name: '/', pageviews: 5, visitors: 3 },
    { name: '/my-link', pageviews: 2, visitors: 2 },
    { name: '/old-page', pageviews: 4, visitors: 1 },
  ];
  it('matches by appPath and permalink; unmatched is null', () => {
    const out = attachTitles(rows, pages, 'https://x.example');
    expect(out[0]).toEqual({
      path: '/',
      title: 'Home',
      href: 'https://x.example/',
      people: 3,
      views: 5,
    });
    expect(out[1]!.title).toBe('A post');
    expect(out[2]).toEqual({
      path: '/old-page',
      title: null,
      href: null,
      people: 1,
      views: 4,
    });
  });
  it('falls back to Home for an untitled root', () => {
    const out = attachTitles(
      [rows[0]!],
      [{ appPath: '/', permalink: null, title: '' }],
      'https://x.example',
    );
    expect(out[0]!.title).toBe('Home');
  });
});

describe('siteCountability', () => {
  it('classifies', () => {
    expect(
      siteCountability({ privacyMode: 'PASSWORD' }, { pages: 3, rawHtml: 0 })
        .kind,
    ).toBe('password');
    expect(
      siteCountability({ privacyMode: 'PUBLIC' }, { pages: 0, rawHtml: 3 })
        .kind,
    ).toBe('html-only');
    expect(
      siteCountability({ privacyMode: 'PUBLIC' }, { pages: 4, rawHtml: 1 }),
    ).toEqual({ kind: 'counted', hasRawHtml: true });
  });
});

describe('getSiteAnalytics', () => {
  const site = {
    id: 's1',
    createdAt: new Date('2026-12-18T10:00:00Z'),
    url: 'https://x.example',
  };
  const loadPages = async () => [
    { appPath: '/', permalink: null, title: 'Home' },
  ];
  const okClient = (): UmamiClient => ({
    stats: async () => ({ pageviews: 9, visitors: 4 }),
    pageviewsByDay: async () => [{ date: '2026-12-19', pageviews: 9 }],
    metrics: async ({ type }) =>
      type === 'path'
        ? [{ name: '/', pageviews: 9, visitors: 4 }]
        : [
            { name: '', pageviews: 50, visitors: 50 },
            ...Array.from({ length: 7 }, (_, i) => ({
              name: `r${i}.com`,
              pageviews: 1,
              visitors: 7 - i,
            })),
          ],
  });

  it('assembles, zero-fills series and trims referrers', async () => {
    const r = await getSiteAnalytics(site, 30, {
      client: okClient(),
      now,
      loadPages,
    });
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.chartStart).toBe('2026-12-18');
    expect(r.countingSince).toBe('2026-12-18');
    expect(r.series.map((s) => s.date)).toEqual([
      '2026-12-18',
      '2026-12-19',
      '2026-12-20',
    ]);
    expect(r.series.map((s) => s.views)).toEqual([0, 9, 0]);
    expect(r.totals).toEqual({ people: 4, views: 9 });
    expect(r.referrers).toHaveLength(5);
    expect(r.referrers.every((x) => x.domain !== '')).toBe(true);
    expect(r.pages[0]!.title).toBe('Home');
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
  it('drops self-referrals, with or without www, any case', async () => {
    const c = okClient();
    c.metrics = async ({ type }) =>
      type === 'path'
        ? []
        : [
            { name: 'x.example', pageviews: 9, visitors: 9 },
            { name: 'WWW.X.Example', pageviews: 8, visitors: 8 },
            { name: 'google.com', pageviews: 3, visitors: 3 },
            { name: 'sub.x.example', pageviews: 2, visitors: 2 },
          ];
    const r = await getSiteAnalytics(
      { ...site, url: 'https://www.x.example' },
      30,
      { client: c, now, loadPages },
    );
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.referrers.map((x) => x.domain)).toEqual([
      'google.com',
      'sub.x.example',
    ]);
  });
  it('is unavailable when stats rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const c = okClient();
    c.stats = async () => {
      throw new Error('boom');
    };
    expect(
      await getSiteAnalytics(site, 30, { client: c, now, loadPages }),
    ).toEqual({ status: 'unavailable' });
  });
  it('is unavailable with no client', async () => {
    expect(
      await getSiteAnalytics(site, 30, { client: null, now, loadPages }),
    ).toEqual({ status: 'unavailable' });
  });
});

describe('getSiteAnalytics titles failure', () => {
  it('still returns numbers when loadPages rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await getSiteAnalytics(
      {
        id: 's1',
        createdAt: new Date('2026-12-18T10:00:00Z'),
        url: 'https://x.example',
      },
      30,
      {
        client: {
          stats: async () => ({ pageviews: 1, visitors: 1 }),
          pageviewsByDay: async () => [],
          metrics: async ({ type }) =>
            type === 'path' ? [{ name: '/a', pageviews: 1, visitors: 1 }] : [],
        },
        now,
        loadPages: async () => {
          throw new Error('db down');
        },
      },
    );
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.pages).toEqual([
      { path: '/a', title: null, href: null, people: 1, views: 1 },
    ]);
  });
});

describe('loadSiteCountability', () => {
  const site = { id: 's1', privacyMode: 'PUBLIC' };
  it('counts pages and html files', async () => {
    const count = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    expect(await loadSiteCountability(site, { blob: { count } })).toEqual({
      kind: 'html-only',
      hasRawHtml: true,
    });
    expect(count.mock.calls[1]![0].where.path).toMatchObject({
      endsWith: '.html',
      mode: 'insensitive',
    });
  });
  it('does not count _footer.html and _navbar.html as raw HTML', async () => {
    const count = vi.fn().mockResolvedValue(1);
    await loadSiteCountability(site, { blob: { count } });
    expect(count.mock.calls[1]![0].where.path.notIn).toEqual([
      '_footer.html',
      '_navbar.html',
    ]);
  });
  it('defaults to counted when the db fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = {
      blob: {
        count: async () => {
          throw new Error('x');
        },
      },
    };
    expect(await loadSiteCountability(site, db)).toEqual({
      kind: 'counted',
      hasRawHtml: false,
    });
  });
});
