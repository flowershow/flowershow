import { unstable_cache } from 'next/cache';
import prisma from '@/server/db';
import {
  canonicalGroupKeys,
  groupKey,
  type ListingRow,
  rawListingImage,
  selectListingRows,
} from './items';
import type { ListingSpec } from './spec';

export type ListingDb = {
  blob: { findMany: (args: any) => Promise<unknown[]> };
};
export type ListingIndex = {
  ids: string[];
  paths: string[];
  featured: number[];
  groups: string[] | null;
  /** Each item's image value as written (resolved by the caller), so image decisions cover the whole listing, not one page. */
  images?: (string | null)[];
};

const ROW_SELECT = {
  id: true,
  path: true,
  appPath: true,
  permalink: true,
  metadata: true,
} as const;

export async function fetchFolderRows(
  db: ListingDb,
  {
    siteId,
    folder,
    withTags,
  }: { siteId: string; folder: string; withTags: boolean },
): Promise<ListingRow[]> {
  return (await db.blob.findMany({
    where: {
      siteId,
      appPath: { not: null },
      extension: { in: ['md', 'mdx'] },
      ...(folder ? { path: { startsWith: `${folder}/` } } : {}),
    },
    select: {
      ...ROW_SELECT,
      ...(withTags ? { tags: { select: { tag: true } } } : {}),
    },
  })) as ListingRow[];
}

const isFeatured = (m: Record<string, unknown> | null) =>
  m?.featured === true || m?.featured === 'true';

export function buildIndex(
  rows: ListingRow[],
  spec: Pick<ListingSpec, 'from' | 'group' | 'fields'>,
): ListingIndex {
  return {
    ids: rows.map((r) => r.id),
    paths: rows.map((r) => r.path),
    featured: rows.flatMap((r, i) => (isFeatured(r.metadata) ? [i] : [])),
    images: rows.map((r) => rawListingImage(r.metadata, spec.fields.image)),
    groups:
      spec.group.by === 'none'
        ? null
        : spec.group.by === 'field' || spec.group.by === 'folder'
          ? canonicalGroupKeys(rows.map((r) => groupKey(r, spec) ?? ''))
          : rows.map((r) => groupKey(r, spec) ?? ''),
  };
}

/**
 * The folder's items, filtered and ordered (group first, then sort), cached per
 * site/folder/where/sort/date slot/group and invalidated by the site tag on
 * publish. Only ids, paths, featured positions, group keys and raw image values are cached.
 */
export async function queryListingIndex(
  { siteId, spec, today }: { siteId: string; spec: ListingSpec; today: string },
  db: ListingDb = prisma as unknown as ListingDb,
): Promise<ListingIndex> {
  const usesToday =
    spec.where.date?.some((v) => v === 'upcoming' || v === 'past') ?? false;
  const key = JSON.stringify({
    from: spec.from,
    where: Object.entries(spec.where).sort(([a], [b]) => (a < b ? -1 : 1)),
    sort: spec.sort,
    date: spec.fields.date,
    image: spec.fields.image,
    group: spec.group,
    today: usesToday ? today : null,
  });
  return unstable_cache(
    async (sid: string, keyJson: string) => {
      const k = JSON.parse(keyJson) as {
        from: string;
        where: [string, string[]][];
        sort: ListingSpec['sort'];
        date: string | null;
        image: string | null;
        group: ListingSpec['group'];
      };
      const s = {
        from: k.from,
        where: Object.fromEntries(k.where),
        sort: k.sort,
        group: k.group,
        fields: { ...spec.fields, date: k.date, image: k.image },
      };
      const rows = await fetchFolderRows(db, {
        siteId: sid,
        folder: k.from,
        withTags: 'tags' in s.where,
      });
      return buildIndex(selectListingRows(rows, s, today), s);
    },
    ['listing-index'],
    { revalidate: 60, tags: [siteId] },
  )(siteId, key);
}

export async function fetchRowsByIds(
  db: ListingDb,
  siteId: string,
  ids: string[],
): Promise<ListingRow[]> {
  if (ids.length === 0) return [];
  const rows = (await db.blob.findMany({
    where: { siteId, id: { in: ids } },
    select: ROW_SELECT,
  })) as ListingRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}
