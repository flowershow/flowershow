import { unstable_cache } from 'next/cache';
import prisma from '@/server/db';
import { ANALYTICS_CACHE_SECONDS, ANALYTICS_COUNTING_SINCE } from './config';
import {
  PAGE_BLOB_WHERE,
  RAW_HTML_BLOB_WHERE,
  rangeWindow,
  siteCountability,
} from './site-analytics';
import { getUmamiClient, type UmamiClient } from './umami-client';

export type BlobCounts = { pages: number; rawHtml: number };

type GroupDb = {
  blob: {
    groupBy(args: {
      by: ['siteId'];
      where: Record<string, unknown>;
      _count: { _all: true };
    }): Promise<Array<{ siteId: string; _count: { _all: number } }>>;
  };
};

/**
 * Page and raw-HTML file counts for many sites, in two grouped queries.
 * Never throws: on a database error returns {} (sites are treated as counted).
 */
export async function loadBlobCountsBySite(
  siteIds: string[],
  db: GroupDb = prisma as unknown as GroupDb,
): Promise<Record<string, BlobCounts>> {
  if (siteIds.length === 0) return {};
  const count = (where: Record<string, unknown>) =>
    db.blob.groupBy({
      by: ['siteId'],
      where: { siteId: { in: siteIds }, ...where },
      _count: { _all: true },
    });
  try {
    const [pages, rawHtml] = await Promise.all([
      count(PAGE_BLOB_WHERE),
      count(RAW_HTML_BLOB_WHERE),
    ]);
    const out: Record<string, BlobCounts> = {};
    for (const id of siteIds) out[id] = { pages: 0, rawHtml: 0 };
    for (const r of pages)
      if (out[r.siteId]) out[r.siteId]!.pages = r._count._all;
    for (const r of rawHtml)
      if (out[r.siteId]) out[r.siteId]!.rawHtml = r._count._all;
    return out;
  } catch (error) {
    console.error('[site-analytics] blob counts by site failed:', error);
    return {};
  }
}

/**
 * The people number to show on a site card, or undefined for no line:
 * password-protected and html-only sites, or when numbers are unavailable.
 */
export function cardPeople(
  site: { id: string; privacyMode: string },
  counts: BlobCounts | undefined,
  people: Record<string, number> | null,
): number | undefined {
  if (!people) return undefined;
  const { kind } = siteCountability(site, counts ?? { pages: 0, rawHtml: 0 });
  if (kind !== 'counted') return undefined;
  return people[site.id];
}

const PAGE_SIZE = 500;
// Safety stop so a misbehaving API can never loop forever.
const MAX_PAGES = 100;

/**
 * People in the last 30 days for each of the given sites, from one cached
 * listing of all tags (tag = site id). A listed site with no row is 0.
 * Returns null when the numbers are unavailable.
 */
export async function getPeopleBySite(
  siteIds: string[],
  deps: { client?: UmamiClient | null; now?: Date } = {},
): Promise<Record<string, number> | null> {
  const client = deps.client === undefined ? getUmamiClient() : deps.client;
  if (!client) return null;
  const now = deps.now ?? new Date();
  const { startAt, endAt } = rangeWindow(30, now, ANALYTICS_COUNTING_SINCE);

  // Throws on failure so failures are not cached. Plain object: JSON-safe.
  const fetchAll = async (): Promise<Record<string, number>> => {
    const all: Record<string, number> = {};
    for (let page = 0; page < MAX_PAGES; page++) {
      const rows = await client.metrics({
        startAt,
        endAt,
        type: 'tag',
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      for (const r of rows) all[r.name] = r.visitors;
      if (rows.length < PAGE_SIZE) break;
    }
    return all;
  };

  try {
    const all = await unstable_cache(fetchAll, ['people-by-site-30d'], {
      revalidate: ANALYTICS_CACHE_SECONDS,
    })();
    const out: Record<string, number> = {};
    for (const id of siteIds) out[id] = all[id] ?? 0;
    return out;
  } catch (error) {
    console.error('[site-analytics] people-by-site read failed:', error);
    return null;
  }
}
