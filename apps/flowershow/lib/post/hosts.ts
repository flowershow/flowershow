import { unstable_cache } from 'next/cache';
import type { ListingDb } from '@/lib/listing/query';
import prisma from '@/server/db';

type Meta = Record<string, unknown> | null;

/**
 * Frontmatter of the pages that configure a post's ancestor folders (their
 * index pages and folder notes, from postHostPaths), in one query cached per
 * site and path set and invalidated on publish like the listing caches.
 */
export async function loadPostHosts(
  siteId: string,
  paths: string[],
  db: ListingDb = prisma as unknown as ListingDb,
): Promise<Record<string, Meta>> {
  if (paths.length === 0) return {};
  const sorted = [...new Set(paths)].sort();
  const rows = await unstable_cache(
    async (sid: string, pathsJson: string) =>
      (await db.blob.findMany({
        where: { siteId: sid, path: { in: JSON.parse(pathsJson) as string[] } },
        select: { path: true, metadata: true },
      })) as Array<{ path: string; metadata: Meta }>,
    ['post-host-metadata'],
    { revalidate: 60, tags: [siteId] },
  )(siteId, JSON.stringify(sorted));
  return Object.fromEntries(rows.map((r) => [r.path, r.metadata ?? null]));
}
