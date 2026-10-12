import { unstable_cache } from 'next/cache';
import { isListedRow, slotDate } from '@/lib/listing/items';
import { fetchFolderRows, type ListingDb } from '@/lib/listing/query';
import prisma from '@/server/db';
import { datedShareDirs, type PostFiles, postHostPaths } from './route';

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

/**
 * For `layout: list` folders whose post verdict depends on it (datedShareDirs):
 * the share of the folder's listed pages that have a date. One cached folder
 * scan per site, folder and date key; only the number is cached.
 */
export async function loadDatedShares(
  siteId: string,
  dirs: Array<{ dir: string; dateKey: string | null }>,
  db: ListingDb = prisma as unknown as ListingDb,
): Promise<Record<string, number>> {
  const shares = await Promise.all(
    dirs.map(({ dir, dateKey }) =>
      unstable_cache(
        async (sid: string, folder: string, key: string) => {
          const rows = await fetchFolderRows(db, {
            siteId: sid,
            folder,
            withTags: false,
          });
          const listed = rows.filter((r) => isListedRow(r, folder));
          if (listed.length === 0) return 0;
          const dated = listed.filter(
            (r) => slotDate(r, key || null) !== null,
          ).length;
          return dated / listed.length;
        },
        ['post-dated-share'],
        { revalidate: 60, tags: [siteId] },
      )(siteId, dir, dateKey ?? ''),
    ),
  );
  return Object.fromEntries(dirs.map(({ dir }, i) => [dir, shares[i]!]));
}

/**
 * Everything resolvePostRoute needs from the database, in one call the route
 * can start early: the host frontmatter, then the dated share of a
 * `layout: list` folder whose verdict depends on it. Null (logged loudly)
 * when a lookup fails: the page then renders as an ordinary page.
 */
export async function loadPostRouteInputs(
  siteId: string,
  pagePath: string,
  files: PostFiles,
  rootDir?: string,
): Promise<{
  hosts: Record<string, Meta>;
  datedShare: Record<string, number>;
} | null> {
  try {
    const hosts = await loadPostHosts(siteId, postHostPaths(pagePath, files));
    const dirs = datedShareDirs({ pagePath, files, hosts, rootDir });
    const datedShare = dirs.length ? await loadDatedShares(siteId, dirs) : {};
    return { hosts, datedShare };
  } catch (error) {
    console.error(
      `[post] host lookup failed for site ${siteId} (${pagePath}); rendering it as an ordinary page:`,
      error,
    );
    return null;
  }
}
