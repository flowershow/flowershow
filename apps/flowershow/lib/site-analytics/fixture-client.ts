import type { UmamiClient, UmamiRow, UmamiWindow } from './umami-client';

// Deterministic SAMPLE data for local dev, tests and Storybook. Not real
// numbers. A tag starting `empty-` gives zeros and empty lists.

const PATHS = [
  '/',
  '/blog/why-markdown',
  '/docs/getting-started',
  '/about',
  '/blog/publishing-notes',
  '/docs/themes',
];
const REFERRERS = ['google.com', 'x.com', 'news.ycombinator.com'];
const TAGS = ['site:sample-blog', 'site:sample-docs', 'site:sample-garden'];
const DAY_MS = 86_400_000;

// Small string hash so the same tag always gives the same numbers.
function seed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const isEmpty = (w: UmamiWindow) => w.tag?.startsWith('empty-') ?? false;

function sampleRows(names: string[], w: UmamiWindow): UmamiRow[] {
  const base = seed(w.tag ?? '');
  return names.map((name, i) => {
    const pageviews = 10 + ((base >> i) % 90) + (names.length - i) * 20;
    return {
      name,
      pageviews,
      visitors: Math.max(1, Math.round(pageviews / 2)),
    };
  });
}

export function createFixtureUmamiClient(): UmamiClient {
  const metrics: UmamiClient['metrics'] = async (w) => {
    if (isEmpty(w)) return [];
    const names =
      w.type === 'path' ? PATHS : w.type === 'referrer' ? REFERRERS : TAGS;
    return sampleRows(names, w).slice(w.offset ?? 0, (w.offset ?? 0) + w.limit);
  };

  return {
    metrics,

    async stats(w) {
      if (isEmpty(w)) return { pageviews: 0, visitors: 0 };
      const rows = await metrics({ ...w, type: 'path', limit: 500 });
      const pageviews = rows.reduce((n, r) => n + r.pageviews, 0);
      return { pageviews, visitors: Math.round(pageviews / 2) };
    },

    async pageviewsByDay(w) {
      const start = Math.floor(w.startAt / DAY_MS);
      const end = Math.floor(w.endAt / DAY_MS);
      const base = seed(w.tag ?? '');
      const out: Array<{ date: string; pageviews: number }> = [];
      for (let d = start; d <= end; d++) {
        out.push({
          date: new Date(d * DAY_MS).toISOString().slice(0, 10),
          pageviews: isEmpty(w) ? 0 : 5 + (((base >> (d % 16)) + d * 7) % 40),
        });
      }
      return out;
    },
  };
}
