import { env } from '@/env.mjs';

import { UMAMI_HOST, UMAMI_TIMEOUT_MS, UMAMI_WEBSITE_ID } from './config';
import { createFixtureUmamiClient } from './fixture-client';

export type UmamiWindow = { startAt: number; endAt: number; tag?: string };
export type UmamiRow = { name: string; pageviews: number; visitors: number };

export interface UmamiClient {
  stats(w: UmamiWindow): Promise<{ pageviews: number; visitors: number }>;
  /** date is YYYY-MM-DD, UTC */
  pageviewsByDay(
    w: UmamiWindow,
  ): Promise<Array<{ date: string; pageviews: number }>>;
  metrics(
    w: UmamiWindow & {
      type: 'path' | 'referrer' | 'tag';
      limit: number;
      offset?: number;
    },
  ): Promise<UmamiRow[]>;
}

// Our self-hosted Umami takes the API key as a Bearer token
// (x-umami-api-key is Umami Cloud only and gets a 401).
function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

export function createHttpUmamiClient(opts: {
  host: string;
  websiteId: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): UmamiClient {
  const {
    websiteId,
    apiKey,
    fetchImpl = fetch,
    timeoutMs = UMAMI_TIMEOUT_MS,
  } = opts;
  const host = opts.host.replace(/\/+$/, '');

  async function get<T>(
    path: string,
    params: Record<string, string | number | undefined>,
  ): Promise<T> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const res = await fetchImpl(
      `${host}/api/websites/${websiteId}${path}?${qs}`,
      {
        headers: authHeaders(apiKey),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    if (!res.ok) throw new Error(`Umami ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  const win = (w: UmamiWindow) => ({
    startAt: w.startAt,
    endAt: w.endAt,
    tag: w.tag,
  });

  // Umami returns some counts as strings (bigint columns, e.g. pageviews
  // in /metrics/expanded), so coerce every count.
  type Count = number | string;

  return {
    async stats(w) {
      const r = await get<{ pageviews: Count; visitors: Count }>(
        '/stats',
        win(w),
      );
      return { pageviews: Number(r.pageviews), visitors: Number(r.visitors) };
    },

    async pageviewsByDay(w) {
      const r = await get<{ pageviews: Array<{ x: string; y: Count }> }>(
        '/pageviews',
        { ...win(w), unit: 'day', timezone: 'UTC' },
      );
      return r.pageviews.map((p) => ({
        date: p.x.slice(0, 10),
        pageviews: Number(p.y),
      }));
    },

    async metrics(w) {
      const rows = await get<
        Array<{ name: string; pageviews: Count; visitors: Count }>
      >('/metrics/expanded', {
        ...win(w),
        type: w.type,
        limit: w.limit,
        offset: w.offset ?? 0,
      });
      return rows.map(({ name, pageviews, visitors }) => ({
        name,
        pageviews: Number(pageviews),
        visitors: Number(visitors),
      }));
    },
  };
}

/**
 * Real client when configured; null on deployed envs without key or
 * constants (callers show "unavailable"); sample data when local.
 */
export function getUmamiClient(): UmamiClient | null {
  const deployed =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const apiKey = env.UMAMI_API_KEY;
  if (apiKey && UMAMI_HOST && UMAMI_WEBSITE_ID) {
    return createHttpUmamiClient({
      host: UMAMI_HOST,
      websiteId: UMAMI_WEBSITE_ID,
      apiKey,
    });
  }
  return deployed ? null : createFixtureUmamiClient();
}
