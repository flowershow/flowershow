/**
 * Data for a post's footer: previous/next in its collection's order and up to
 * three read-more items (same tag first). Skipped above MAX_FOOTER_ITEMS
 * pages. Bounded: the cached ordered index
 * (ids and paths only; the collection page's own cache entry) and the cached
 * tags of the folder (one entry per collection, not per post), fetched in
 * parallel; then one by-id fetch of at most five rows and one cached author
 * lookup.
 */
import { tagMatches } from '@flowershow/core';
import { unstable_cache } from 'next/cache';
import {
  cachedResolveAuthors,
  type ResolvedAuthor,
} from '@/lib/listing/authors';
import { type ListingItem, toListingItem } from '@/lib/listing/items';
import {
  fetchRowsByIds,
  type ListingDb,
  queryListingIndex,
} from '@/lib/listing/query';
import {
  DEFAULT_FIELDS,
  type ListingSpec,
  parseListingSpec,
} from '@/lib/listing/spec';
import prisma from '@/server/db';
import { pickReadMore, postNeighbours } from './neighbours';
import type { PostCollection } from './route';

export const READ_MORE_COUNT = 3;
/** Tags beyond this are ignored for "same tag first". */
export const MAX_MATCH_TAGS = 10;
/** Above this many pages in the collection, posts get no previous/next or read-more. */
export const MAX_FOOTER_ITEMS = 5000;

/** Each page's tags (Tag table: frontmatter and inline) under `folder`, one cached entry per site and folder. */
export async function folderTags(
  db: ListingDb,
  siteId: string,
  folder: string,
): Promise<Record<string, string[]>> {
  return unstable_cache(
    async (sid: string, dir: string) => {
      const rows = (await db.blob.findMany({
        where: {
          siteId: sid,
          extension: { in: ['md', 'mdx'] },
          path: { startsWith: `${dir}/` },
          tags: { some: {} },
        },
        select: { path: true, tags: { select: { tag: true } } },
      })) as Array<{ path: string; tags?: { tag: string }[] }>;
      return Object.fromEntries(
        rows.map((r) => [r.path, (r.tags ?? []).map((t) => t.tag)]),
      );
    },
    ['post-folder-tags'],
    { revalidate: 60, tags: [siteId] },
  )(siteId, folder);
}

export type PostFooterData = {
  previous: ListingItem | null;
  next: ListingItem | null;
  readMore: ListingItem[];
  /** Resolved authors of the read-more items, by handle. */
  authors: Map<string, ResolvedAuthor>;
  /** The collection's spec, as a grid, for rendering the cards. */
  spec: ListingSpec;
};

/**
 * The collection's listing spec (its index page's `list:` options) for the
 * ordered index, and the same spec as a three-card grid for the read-more cards.
 */
export function collectionSpecs(
  collection: PostCollection,
  rootDir?: string,
): { index: ListingSpec; cards: ListingSpec } {
  const opts = {
    source: 'layout' as const,
    defaultFrom: collection.dir,
    rootDir,
  };
  const parsed = parseListingSpec(collection.options, opts);
  const base = parsed.ok
    ? parsed.spec
    : (parseListingSpec(undefined, opts) as { ok: true; spec: ListingSpec })
        .spec;
  const ownFields = base.view === 'list' || base.view === 'grid';
  // Same from/where/sort/date slot/group as the collection page, so the cached index is shared
  const index = { ...base, from: collection.dir, fromRelative: false };
  const cards: ListingSpec = {
    ...index,
    view: 'grid',
    media: 'cover',
    ratio: base.view === 'grid' ? base.ratio : '16/9',
    fields: ownFields ? base.fields : DEFAULT_FIELDS.grid,
    limit: READ_MORE_COUNT,
    pageSize: null,
    featured: 0,
    group: { by: 'none' },
  };
  return { index, cards };
}

export async function loadPostFooter(
  {
    siteId,
    rootDir,
    collection,
    pagePath,
    siteHostname,
    files,
    permalinks,
    locale,
    today = new Date().toISOString().slice(0, 10),
  }: {
    siteId: string;
    rootDir?: string;
    collection: PostCollection;
    pagePath: string;
    siteHostname: string;
    files: string[];
    permalinks?: Record<string, string>;
    locale: string;
    today?: string;
  },
  db: ListingDb = prisma as unknown as ListingDb,
): Promise<PostFooterData | null> {
  const self = pagePath.replace(/^\/+/, '');
  const { index: indexSpec, cards: spec } = collectionSpecs(
    collection,
    rootDir,
  );
  const [index, tagsByPath] = await Promise.all([
    queryListingIndex({ siteId, spec: indexSpec, today }, db),
    folderTags(db, siteId, collection.dir),
  ]);
  // Very large folders: no footer rather than a heavy page (documented)
  if (index.ids.length > MAX_FOOTER_ITEMS) return null;
  // Tag-table tags on both sides (frontmatter and inline #tags alike)
  const matchTags = [...new Set(tagsByPath[self] ?? [])].slice(
    0,
    MAX_MATCH_TAGS,
  );
  const { previous, next } = postNeighbours(index.paths, self, spec.sort);
  const sameTag = index.paths.filter((p) => {
    const own = tagsByPath[p];
    return own?.length ? matchTags.some((t) => tagMatches(own, t)) : false;
  });
  const picks = pickReadMore({
    paths: index.paths,
    sameTag,
    self,
    avoid: [previous, next].filter((p): p is string => p !== null),
    n: READ_MORE_COUNT,
  });
  const idOf = new Map(index.paths.map((p, i) => [p, index.ids[i]!]));
  const wanted = [...new Set([previous, next, ...picks])].filter(
    (p): p is string => p !== null && idOf.has(p),
  );
  const rows = await fetchRowsByIds(
    db,
    siteId,
    wanted.map((p) => idOf.get(p)!),
  );
  const ctx = { siteHostname, files, permalinks, fields: spec.fields, locale };
  const byPath = new Map(rows.map((r) => [r.path, toListingItem(r, ctx)]));
  const readMore = picks.flatMap((p) =>
    byPath.has(p) ? [byPath.get(p)!] : [],
  );
  const handles = spec.fields.authors
    ? [...new Set(readMore.flatMap((i) => i.authorHandles))]
    : [];
  const resolved = handles.length
    ? await cachedResolveAuthors({ siteId, handles, siteHostname, files }, db)
    : [];
  return {
    previous: previous ? (byPath.get(previous) ?? null) : null,
    next: next ? (byPath.get(next) ?? null) : null,
    readMore,
    authors: new Map(handles.map((h, i) => [h, resolved[i]!])),
    spec,
  };
}
