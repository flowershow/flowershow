import { unstable_cache } from 'next/cache';
import prisma from '@/server/db';
import {
  ANALYTICS_CACHE_SECONDS,
  ANALYTICS_COUNTING_SINCE,
  type AnalyticsRange,
} from './config';
import {
  getUmamiClient,
  type UmamiClient,
  type UmamiRow,
} from './umami-client';

export type PageRow = {
  path: string;
  title: string | null;
  href: string | null;
  people: number;
  views: number;
};

export type SiteAnalytics =
  | {
      status: 'ok';
      range: AnalyticsRange;
      /** First day of the chart (YYYY-MM-DD). */
      chartStart: string;
      /** First day this site was counted at all (YYYY-MM-DD). */
      countingSince: string;
      fetchedAt: string;
      totals: { people: number; views: number };
      series: Array<{ date: string; views: number }>;
      pages: PageRow[];
      referrers: Array<{ domain: string; people: number }>;
    }
  | { status: 'unavailable' };

export type SiteCountability = {
  kind: 'counted' | 'password' | 'html-only';
  hasRawHtml: boolean;
};

export type PageTitleInfo = {
  appPath: string;
  permalink: string | null;
  title: string | null;
};

const DAY_MS = 86_400_000;
const MAX_PAGES = 500;
const MAX_REFERRERS = 5;

const utcDay = (d: Date) =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const dayString = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Last N UTC days including today, never before launch or the site's creation
 * day (chartStart). countingSince is when counting began for the site at all,
 * independent of the range.
 */
export function rangeWindow(
  range: AnalyticsRange,
  now: Date,
  siteCreatedAt: Date,
): {
  startAt: number;
  endAt: number;
  chartStart: string;
  countingSince: string;
} {
  const counting = Math.max(
    utcDay(ANALYTICS_COUNTING_SINCE),
    utcDay(siteCreatedAt),
  );
  const startAt = Math.max(utcDay(now) - (range - 1) * DAY_MS, counting);
  return {
    startAt,
    endAt: now.getTime(),
    chartStart: dayString(startAt),
    countingSince: dayString(counting),
  };
}

export function attachTitles(
  rows: UmamiRow[],
  pages: PageTitleInfo[],
  siteUrl: string,
): PageRow[] {
  const base = siteUrl.replace(/\/+$/, '');
  const byPath = new Map<string, PageTitleInfo>();
  for (const p of pages) {
    if (p.permalink) byPath.set(p.permalink, p);
  }
  // appPath wins over another page's permalink.
  for (const p of pages) byPath.set(p.appPath, p);

  return rows.map((r) => {
    const page = byPath.get(r.name);
    let title: string | null = null;
    if (page) {
      title = page.title?.trim() ? page.title : null;
      if (title === null && r.name === '/') title = 'Home';
    }
    return {
      path: r.name,
      title,
      href: page ? base + r.name : null,
      people: r.visitors,
      views: r.pageviews,
    };
  });
}

export function siteCountability(
  site: { privacyMode: string },
  files: { pages: number; rawHtml: number },
): SiteCountability {
  const hasRawHtml = files.rawHtml > 0;
  if (site.privacyMode === 'PASSWORD') return { kind: 'password', hasRawHtml };
  if (files.pages === 0 && hasRawHtml) return { kind: 'html-only', hasRawHtml };
  return { kind: 'counted', hasRawHtml };
}

async function loadPagesFromDb(siteId: string): Promise<PageTitleInfo[]> {
  const blobs = await prisma.blob.findMany({
    where: { siteId, appPath: { not: null } },
    select: { appPath: true, permalink: true, metadata: true },
  });
  return blobs.map((b) => {
    const title = (b.metadata as { title?: unknown } | null)?.title;
    return {
      appPath: b.appPath!,
      permalink: b.permalink,
      title: typeof title === 'string' ? title : null,
    };
  });
}

type Deps = {
  client?: UmamiClient | null;
  now?: Date;
  loadPages?: (siteId: string) => Promise<PageTitleInfo[]>;
};

export async function getSiteAnalytics(
  site: { id: string; createdAt: Date; url: string },
  range: AnalyticsRange,
  deps: Deps = {},
): Promise<SiteAnalytics> {
  const client = deps.client === undefined ? getUmamiClient() : deps.client;
  if (!client) return { status: 'unavailable' };
  const now = deps.now ?? new Date();
  const loadPages = deps.loadPages ?? loadPagesFromDb;
  const { startAt, endAt, chartStart, countingSince } = rangeWindow(
    range,
    now,
    site.createdAt,
  );
  const w = { startAt, endAt, tag: site.id };

  // Throws on failure so failures are not cached.
  const fetchOk = async (): Promise<
    Extract<SiteAnalytics, { status: 'ok' }>
  > => {
    const [stats, byDay, pathRows, refRows, pages] = await Promise.all([
      client.stats(w),
      client.pageviewsByDay(w),
      client.metrics({ ...w, type: 'path', limit: MAX_PAGES }),
      client.metrics({ ...w, type: 'referrer', limit: 20 }),
      loadPages(site.id).catch((error) => {
        console.error(
          `[site-analytics] page titles failed for site ${site.id}:`,
          error,
        );
        return [] as PageTitleInfo[];
      }),
    ]);
    const views = new Map(byDay.map((d) => [d.date, d.pageviews]));
    const series: Array<{ date: string; views: number }> = [];
    for (let t = startAt; t <= utcDay(now); t += DAY_MS) {
      const date = dayString(t);
      series.push({ date, views: views.get(date) ?? 0 });
    }
    return {
      status: 'ok',
      range,
      chartStart,
      countingSince,
      fetchedAt: now.toISOString(),
      totals: { people: stats.visitors, views: stats.pageviews },
      series,
      pages: attachTitles(pathRows, pages, site.url),
      referrers: refRows
        .filter((r) => r.name !== '')
        .slice(0, MAX_REFERRERS)
        .map((r) => ({ domain: r.name, people: r.visitors })),
    };
  };

  try {
    return await unstable_cache(
      fetchOk,
      ['site-analytics', site.id, String(range), site.url],
      {
        revalidate: ANALYTICS_CACHE_SECONDS,
        tags: [`site-analytics-${site.id}`],
      },
    )();
  } catch (error) {
    console.error(
      `[site-analytics] Umami read failed for site ${site.id}:`,
      error,
    );
    return { status: 'unavailable' };
  }
}

type CountDb = {
  blob: { count(args: { where: Record<string, unknown> }): Promise<number> };
};

/** Never throws: on a database error the site is treated as counted. */
export async function loadSiteCountability(
  site: { id: string; privacyMode: string },
  db: CountDb = prisma as unknown as CountDb,
): Promise<SiteCountability> {
  try {
    const [pages, rawHtml] = await Promise.all([
      db.blob.count({ where: { siteId: site.id, appPath: { not: null } } }),
      db.blob.count({
        where: {
          siteId: site.id,
          path: { endsWith: '.html', mode: 'insensitive' },
        },
      }),
    ]);
    return siteCountability(site, { pages, rawHtml });
  } catch (error) {
    console.error(
      `[site-analytics] countability lookup failed for site ${site.id}:`,
      error,
    );
    return { kind: 'counted', hasRawHtml: false };
  }
}
