import { unstable_cache } from 'next/cache';
import { ANALYTICS_CACHE_SECONDS, ANALYTICS_COUNTING_SINCE } from './config';
import { rangeWindow } from './site-analytics';
import { getUmamiClient, type UmamiClient } from './umami-client';

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
