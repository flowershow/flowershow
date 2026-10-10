export type PageWindowEntry = number | 'ellipsis';

/**
 * Page numbers a pagination strip shows: the first, the last and the current
 * page ±radius. A gap of exactly one page shows that page; a longer gap
 * collapses into a single 'ellipsis'.
 */
export function pageWindow(
  current: number,
  pageCount: number,
  radius = 2,
): PageWindowEntry[] {
  if (pageCount < 1) return [];
  const c = Math.min(Math.max(1, Math.trunc(current) || 1), pageCount);
  const shown = new Set<number>([1, pageCount]);
  for (let p = c - radius; p <= c + radius; p++) {
    if (p >= 1 && p <= pageCount) shown.add(p);
  }
  const out: PageWindowEntry[] = [];
  let prev = 0;
  for (const p of [...shown].sort((a, b) => a - b)) {
    if (p - prev === 2) out.push(prev + 1);
    else if (p - prev > 2) out.push('ellipsis');
    out.push(p);
    prev = p;
  }
  return out;
}
