import { matchLinkTarget } from '@flowershow/core';
import { unstable_cache } from 'next/cache';
import { resolveContentLink } from '@/lib/resolve-link';
import prisma from '@/server/db';
import { ensureLeadingSlash, extractWikiLinkTarget } from '@/lib/utils';
import type { ListingDb } from './query';
// ListingDb is a type-only import, so authors.ts does not pull query.ts into bundles that only need types.

export type ResolvedAuthor = {
  key: string;
  name: string;
  url: string | null;
  avatar?: string;
};
type AuthorBlob = {
  id: string;
  path: string;
  appPath: string | null;
  permalink: string | null;
  metadata: Record<string, unknown> | null;
};

const clean = (h: string) =>
  (extractWikiLinkTarget(h.trim()) ?? h.trim())
    .replace(/^\/+/, '')
    .replace(/\.mdx?$/i, '');

/** The display text of `[[target|Alias]]`, which wins over the page title or handle. */
const aliasOf = (h: string) =>
  h
    .trim()
    .match(/^\[\[[^|]+?\|(.+?)\]\]$/)?.[1]
    ?.trim() || null;

export function authorPathMatches(handle: string, path: string): boolean {
  const h = clean(handle);
  return [`${h}.md`, `${h}.mdx`].some(
    (f) => path === f || path.endsWith(`/${f}`),
  );
}

export function pickAuthorBlob<T extends { path: string }>(
  handle: string,
  candidates: T[],
): T | undefined {
  const rank = (p: string) => (/(^|\/)(people|authors)\//.test(p) ? 0 : 1);
  return candidates
    .filter((c) => authorPathMatches(handle, c.path))
    .sort(
      (a, b) =>
        rank(a.path) - rank(b.path) ||
        a.path.length - b.path.length ||
        (a.path < b.path ? -1 : 1),
    )[0];
}

/** The cacheable part of an author page: no bodies, no other frontmatter. */
type AuthorRow = {
  id: string;
  path: string;
  appPath: string | null;
  permalink: string | null;
  title: string;
  avatar: string | null;
};

async function fetchAuthorRows(
  db: ListingDb,
  siteId: string,
  unique: string[],
): Promise<AuthorRow[]> {
  if (unique.length === 0) return [];
  const blobs = (await db.blob.findMany({
    where: {
      siteId,
      OR: unique.flatMap((h) => [
        { path: `${h}.md` },
        { path: `${h}.mdx` },
        { path: { endsWith: `/${h}.md` } },
        { path: { endsWith: `/${h}.mdx` } },
      ]),
    },
    select: {
      id: true,
      path: true,
      appPath: true,
      permalink: true,
      metadata: true,
    },
  })) as AuthorBlob[];
  return blobs.map((b) => {
    const m = b.metadata ?? {};
    return {
      id: b.id,
      path: b.path,
      appPath: b.appPath,
      permalink: b.permalink,
      title:
        m.title == null || typeof m.title === 'object'
          ? ''
          : String(m.title).trim(),
      avatar:
        typeof m.avatar === 'string' && m.avatar.trim()
          ? m.avatar.trim()
          : null,
    };
  });
}

function toResolvedAuthors(
  handles: string[],
  rows: AuthorRow[],
  siteHostname: string,
  files: string[],
): ResolvedAuthor[] {
  const siteFiles = files.map((p) => ({ path: p.replace(/^\/+/, '') }));
  return handles.map((handle) => {
    const row = pickAuthorBlob(handle, rows);
    const alias = aliasOf(handle);
    if (!row)
      return { key: handle, name: alias || clean(handle) || handle, url: null };
    let avatar: string | undefined;
    if (row.avatar) {
      const wiki = extractWikiLinkTarget(row.avatar);
      const target =
        wiki !== null
          ? (matchLinkTarget(wiki, siteFiles)?.path ?? wiki)
          : row.avatar;
      avatar = resolveContentLink({ target, siteHostname });
    }
    return {
      key: row.id,
      name: alias || row.title || clean(handle),
      url: ensureLeadingSlash(row.permalink || row.appPath || ''),
      ...(avatar ? { avatar } : {}),
    };
  });
}

export async function resolveAuthors(
  db: ListingDb,
  {
    siteId,
    handles,
    siteHostname,
    files,
  }: {
    siteId: string;
    handles: string[];
    siteHostname: string;
    files: string[];
  },
): Promise<ResolvedAuthor[]> {
  const unique = [...new Set(handles.map(clean).filter(Boolean))];
  return toResolvedAuthors(
    handles,
    await fetchAuthorRows(db, siteId, unique),
    siteHostname,
    files,
  );
}

export async function cachedResolveAuthors(
  args: {
    siteId: string;
    handles: string[];
    siteHostname: string;
    files: string[];
  },
  db: ListingDb = prisma as unknown as ListingDb,
): Promise<ResolvedAuthor[]> {
  const unique = [...new Set(args.handles.map(clean).filter(Boolean))].sort();
  const rows = await unstable_cache(
    async (siteId: string, handlesJson: string) =>
      fetchAuthorRows(db, siteId, JSON.parse(handlesJson) as string[]),
    ['listing-author-rows'],
    { revalidate: 60, tags: [args.siteId] },
  )(args.siteId, JSON.stringify(unique));
  return toResolvedAuthors(args.handles, rows, args.siteHostname, args.files);
}
