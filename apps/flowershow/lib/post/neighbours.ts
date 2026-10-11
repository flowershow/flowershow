import type { ListingSort } from '@/lib/listing/spec';

/**
 * The posts beside `self` in its collection's order. With the default
 * `date desc`, "previous" is the older post and "next" the newer one (the
 * changelog entry nav's convention); any other order reads top to bottom.
 */
export function postNeighbours(
  paths: string[],
  self: string,
  sort: ListingSort,
): { previous: string | null; next: string | null } {
  const i = paths.indexOf(self);
  if (i === -1) return { previous: null, next: null };
  const before = paths[i - 1] ?? null;
  const after = paths[i + 1] ?? null;
  return sort.field === 'date' && sort.direction === 'desc'
    ? { previous: after, next: before }
    : { previous: before, next: after };
}

/**
 * Up to `n` read-more posts: those sharing a tag with `self` first, then the
 * rest, both in collection order (newest first by default). Never `self`;
 * `avoid` (the prev/next posts, already linked) only fills what is left.
 */
export function pickReadMore({
  paths,
  sameTag,
  self,
  avoid,
  n = 3,
}: {
  paths: string[];
  sameTag: string[];
  self: string;
  avoid: string[];
  n?: number;
}): string[] {
  const tagged = new Set(sameTag);
  const avoided = new Set(avoid);
  const others = paths.filter((p) => p !== self);
  const rank = (p: string) => (avoided.has(p) ? 2 : tagged.has(p) ? 0 : 1);
  return others
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, n)
    .map((x) => x.p);
}
