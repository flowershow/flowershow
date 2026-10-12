/**
 * Which pages get the post layout (docs/plans/2026-10-11-post-page-layout.md,
 * section 2 and "Changes after review"): pages that are items of a
 * collection, plus any page with `layout: post`. A collection is the nearest
 * ancestor folder that is configured, walking up only through folders with no
 * configuration of their own:
 *
 * - a `layout: list` folder that looks like a dated feed (an explicit
 *   `sort: date`, `postLayout: true`, or at least 80% of its listed pages
 *   dated); any other `layout: list` folder (a catalogue, a team) stops the walk;
 * - a zero-config `blog`/`posts` folder, whose pages are posts only when they
 *   have a date;
 * - `postLayout: false` (or `list: false`, or another `layout`) on a folder's
 *   index stops the walk: its pages are never posts.
 *
 * Pure: the route reads the host pages' frontmatter (postHostPaths) and the
 * dated share of `layout: list` folders (datedShareDirs) and passes them in.
 */
import { encodeSlug, filePathToSlug } from '@flowershow/core';
import { type Breadcrumb, findBreadcrumbs } from '@/lib/breadcrumbs';
import { isDir, type Node } from '@/lib/build-site-tree';
import { dirOf, entryDateFromPath, isFolderIndexPath } from '@/lib/changelog';
import { resolveFolderCase } from '@/lib/listing/items';
import { isAutoListingDirName } from '@/lib/listing/route';
import { parseListingSpec } from '@/lib/listing/spec';
import { safeDate } from '@/lib/utils';

type Meta = Record<string, unknown> | null | undefined;

export type PostCollection = {
  /** The listed folder, relative to the site root (rootDir applied). */
  dir: string;
  /** The host page's `list:` options (undefined for the zero-config default). */
  options: unknown;
  source: 'layout' | 'auto';
  /** The index page or folder note that configures the folder, if any. */
  hostPath: string | null;
};
export type PostRoute =
  | { kind: 'none' }
  | { kind: 'post'; collection: PostCollection | null };

/** The site's file paths, without leading slashes and by lower case: built once per request. */
export type PostFiles = { plain: string[]; byLower: Map<string, string> };
export function postFiles(siteFilePaths: string[]): PostFiles {
  const plain = siteFilePaths.map((f) => f.replace(/^\/+/, ''));
  return { plain, byLower: new Map(plain.map((f) => [f.toLowerCase(), f])) };
}

/** Share of a `layout: list` folder's listed pages that have a date, at or above which it is a feed of posts. */
export const DATED_FEED_SHARE = 0.8;
/** Same order as the changelog's folder-index lookup (index first). */
const INDEX_NAMES = ['index.md', 'index.mdx', 'README.md', 'README.mdx'];
/** `layout: blog` was the documented layout for blog posts in older Flowershow. */
const POST_LAYOUTS = new Set(['post', 'blog']);
/** Dates that make a page in a zero-config blog folder a post (not `created`, which tools stamp on every note). */
const POST_DATE_KEYS = ['date', 'publishDate', 'pubDate', 'published'];

/** A layout other than `post` (or the legacy `blog`) keeps the page as it is (cheap pre-check, no queries). */
export function mayBePost(metadata: Meta): boolean {
  const layout = metadata?.layout;
  return layout == null || layout === '' || isPostLayout(layout);
}
const isPostLayout = (layout: unknown) =>
  typeof layout === 'string' && POST_LAYOUTS.has(layout);
const isOff = (v: unknown) => v === false || v === 'false';
const isOn = (v: unknown) => v === true || v === 'true';
const isSet = (v: unknown) => v != null && v !== '';

/** Does the page carry a publication date (frontmatter, or a YYYY-MM-DD file name)? */
export function hasPostDate(metadata: Meta, pagePath: string): boolean {
  for (const k of POST_DATE_KEYS) {
    const v = metadata?.[k];
    if (
      (typeof v === 'string' || typeof v === 'number' || v instanceof Date) &&
      safeDate(v)
    )
      return true;
  }
  return entryDateFromPath(pagePath.replace(/^\/+/, '')) !== null;
}

/** Folders a page can be an item of, nearest first; never the site root. A nested index represents its folder, so it starts one level up. */
function ancestorDirs(pagePath: string): string[] {
  const p = pagePath.replace(/^\/+/, '');
  let dir = dirOf(p);
  if (isFolderIndexPath(p)) dir = dirOf(dir);
  const out: string[] = [];
  while (dir) {
    out.push(dir);
    dir = dirOf(dir);
  }
  return out;
}

/** The files that configure `dir`: its index (index/README, any case) then a folder note beside it (`dir.md`). */
function hostsOf(dir: string, files: PostFiles): string[] {
  const candidates = [
    ...INDEX_NAMES.map((n) => `${dir}/${n}`),
    `${dir}.md`,
    `${dir}.mdx`,
  ];
  const found: string[] = [];
  for (const c of candidates) {
    const hit = files.byLower.get(c.toLowerCase());
    if (hit && !found.includes(hit)) found.push(hit);
  }
  return found;
}

/** Every host file among the page's ancestors, for one frontmatter query. */
export function postHostPaths(pagePath: string, files: PostFiles): string[] {
  return ancestorDirs(pagePath).flatMap((d) => hostsOf(d, files));
}

/** Does a folder's host configure it (so the walk stops here, one way or the other)? */
const configures = (m: Meta) =>
  isSet(m?.layout) || isSet(m?.list) || isSet(m?.postLayout);

/** An explicit `sort: date…` (or `sortBy: date`) in a `list:` map. */
function sortsByDateExplicitly(options: unknown): boolean {
  if (options == null || typeof options !== 'object' || Array.isArray(options))
    return false;
  const entry = Object.entries(options).find(([k]) =>
    ['sort', 'sortby'].includes(k.toLowerCase().replace(/[-_\s]/g, '')),
  );
  if (!entry || typeof entry[1] !== 'string') return false;
  return /^-?date\b/i.test(entry[1].trim());
}

type ListHostVerdict =
  | { kind: 'foreign' }
  | { kind: 'feed' }
  | { kind: 'catalogue' }
  /** Decided by how many of its pages are dated (see datedShareDirs). */
  | { kind: 'share'; dateKey: string | null };

function judgeListHost(
  hostPath: string,
  ownDir: string,
  meta: Meta,
  files: PostFiles,
  rootDir?: string,
): ListHostVerdict {
  const parsed = parseListingSpec(meta?.list, {
    source: 'layout',
    defaultFrom: ownDir,
    rootDir,
  });
  const from = parsed.ok
    ? { from: parsed.spec.from, relative: parsed.spec.fromRelative }
    : (parsed.from ?? { from: ownDir, relative: false });
  const joined = from.relative
    ? [dirOf(hostPath), from.from].filter(Boolean).join('/')
    : from.from;
  if (resolveFolderCase(joined, files.plain) !== ownDir)
    return { kind: 'foreign' };
  if (isOn(meta?.postLayout)) return { kind: 'feed' };
  if (parsed.ok && parsed.spec.view === 'people') return { kind: 'catalogue' };
  if (parsed.ok && parsed.spec.sort.field !== 'date')
    return { kind: 'catalogue' };
  if (sortsByDateExplicitly(meta?.list)) return { kind: 'feed' };
  return {
    kind: 'share',
    dateKey: parsed.ok ? parsed.spec.fields.date : null,
  };
}

/**
 * The `layout: list` folders on the page's way up whose verdict depends on
 * how many of their pages are dated, with the date key to count. The route
 * loads those shares (cached) before resolving.
 */
export function datedShareDirs({
  pagePath,
  files,
  hosts,
  rootDir,
}: {
  pagePath: string;
  files: PostFiles;
  hosts: Record<string, Meta>;
  rootDir?: string;
}): Array<{ dir: string; dateKey: string | null }> {
  const out: Array<{ dir: string; dateKey: string | null }> = [];
  walk(pagePath, files, hosts, rootDir, (dir, verdict) => {
    if (verdict.kind === 'share') out.push({ dir, dateKey: verdict.dateKey });
  });
  return out;
}

type Step = (dir: string, verdict: ListHostVerdict) => void;

/** The shared upward walk; `onList` sees each `layout: list` verdict. Returns the collection, or null for "stop" / nothing found. */
function walk(
  pagePath: string,
  files: PostFiles,
  hosts: Record<string, Meta>,
  rootDir: string | undefined,
  onList: Step | null,
  datedShare?: Record<string, number>,
): PostCollection | null {
  for (const dir of ancestorDirs(pagePath)) {
    const own = hostsOf(dir, files);
    if (own.some((h) => isOff(hosts[h]?.postLayout))) return null;
    const listHost = own.find((h) => hosts[h]?.layout === 'list');
    if (listHost) {
      const verdict = judgeListHost(
        listHost,
        dir,
        hosts[listHost],
        files,
        rootDir,
      );
      if (onList) {
        onList(dir, verdict);
        return null;
      }
      const isFeed =
        verdict.kind === 'feed' ||
        (verdict.kind === 'share' &&
          (datedShare?.[dir] ?? 0) >= DATED_FEED_SHARE);
      return isFeed
        ? {
            dir,
            options: hosts[listHost]?.list,
            source: 'layout',
            hostPath: listHost,
          }
        : null;
    }
    const primary = own[0] ?? null;
    const meta = primary ? hosts[primary] : null;
    if (isAutoListingDirName(dir) || isOn(meta?.postLayout)) {
      if (
        meta?.list === false ||
        meta?.list === 'false' ||
        (isSet(meta?.layout) && meta?.layout !== 'list')
      )
        return null;
      return { dir, options: meta?.list, source: 'auto', hostPath: primary };
    }
    // Configured but not a listing of this folder (e.g. layout: plain): stop
    if (own.some((h) => configures(hosts[h]))) return null;
  }
  return null;
}

export function findPostCollection({
  pagePath,
  files,
  hosts,
  rootDir,
  datedShare,
}: {
  pagePath: string;
  files: PostFiles;
  hosts: Record<string, Meta>;
  rootDir?: string;
  datedShare?: Record<string, number>;
}): PostCollection | null {
  return walk(pagePath, files, hosts, rootDir, null, datedShare);
}

export function resolvePostRoute({
  pagePath,
  metadata,
  files,
  hosts,
  rootDir,
  datedShare,
}: {
  pagePath: string;
  metadata: Meta;
  files: PostFiles;
  hosts: Record<string, Meta>;
  rootDir?: string;
  datedShare?: Record<string, number>;
}): PostRoute {
  if (!mayBePost(metadata)) return { kind: 'none' };
  const forced = isPostLayout(metadata?.layout);
  const collection = findPostCollection({
    pagePath,
    files,
    hosts,
    rootDir,
    datedShare,
  });
  if (forced) return { kind: 'post', collection };
  if (!collection) return { kind: 'none' };
  // A zero-config folder holds notes too: only dated pages are posts
  if (collection.source === 'auto' && !hasPostDate(metadata, pagePath))
    return { kind: 'none' };
  // A page-level listing (a collection's own index or folder note) is never a
  // post: ancestors start above a folder index, and the route checks
  // resolveListingRoute before this.
  return { kind: 'post', collection };
}

/**
 * The eyebrow is the breadcrumb trail above the post. A README-less blog
 * folder is not a page in the site tree, so its crumb has no link; point it
 * at the folder's generated listing page (the same URL as the virtual route).
 * The crumb is found through the collection's folder node in the site tree,
 * not by depth (contentHide or sidebar paths can drop crumbs above it).
 */
export function linkCollectionCrumb<T extends Breadcrumb>(
  crumbs: T[],
  collection: PostCollection | null,
  { section, tree = [] }: { section?: unknown; tree?: Node[] } = {},
): T[] {
  if (!collection || (typeof section === 'string' && section.trim()))
    return crumbs;
  const href = encodeSlug(filePathToSlug(`${collection.dir}/index.md`));
  if (crumbs.some((c) => c.href === href)) return crumbs;
  const own = findBreadcrumbs(
    tree,
    (n) => isDir(n) && n.path === collection.dir,
  ).at(-1);
  if (!own) return crumbs;
  const matches = crumbs
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.label === own.label && !c.href);
  const hit = matches.at(-1);
  if (!hit) return crumbs;
  return crumbs.map((c, j) => (j === hit.i ? { ...c, href } : c));
}
