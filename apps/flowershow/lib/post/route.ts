/**
 * Which pages get the post layout (docs/plans/2026-10-11-post-page-layout.md,
 * section 2): pages that are items of a collection (a zero-config blog/posts
 * folder, or a folder listed by its own `layout: list` page), plus any page
 * with `layout: post`. Pure: the route reads the host pages' frontmatter
 * (postHostPaths) in one query and passes it in.
 */
import { encodeSlug, filePathToSlug } from '@flowershow/core';
import { dirOf, isFolderIndexPath } from '@/lib/changelog';
import { resolveFolderCase } from '@/lib/listing/items';
import { isAutoListingDirName } from '@/lib/listing/route';
import { parseListingSpec } from '@/lib/listing/spec';

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

/** Same order as the changelog's folder-index lookup (index first). */
const INDEX_NAMES = ['index.md', 'index.mdx', 'README.md', 'README.mdx'];
/** `layout: blog` was the documented layout for blog posts in older Flowershow. */
const POST_LAYOUTS = new Set(['post', 'blog']);
const plain = (files: string[]) => files.map((f) => f.replace(/^\/+/, ''));

/** A layout other than `post` (or the legacy `blog`) keeps the page as it is (cheap pre-check, no queries). */
export function mayBePost(metadata: Meta): boolean {
  const layout = metadata?.layout;
  return layout == null || layout === '' || isPostLayout(layout);
}
const isPostLayout = (layout: unknown) =>
  typeof layout === 'string' && POST_LAYOUTS.has(layout);

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

/** The files that configure `dir`: its index (README/index, any case) then a folder note beside it (`dir.md`). */
function hostsOf(dir: string, byLower: Map<string, string>): string[] {
  const candidates = [
    ...INDEX_NAMES.map((n) => `${dir}/${n}`),
    `${dir}.md`,
    `${dir}.mdx`,
  ];
  const found: string[] = [];
  for (const c of candidates) {
    const hit = byLower.get(c.toLowerCase());
    if (hit && !found.includes(hit)) found.push(hit);
  }
  return found;
}

/** Every host file among the page's ancestors, for one frontmatter query. */
export function postHostPaths(
  pagePath: string,
  siteFilePaths: string[],
): string[] {
  const byLower = lowerIndex(siteFilePaths);
  return ancestorDirs(pagePath).flatMap((d) => hostsOf(d, byLower));
}

const lowerIndex = (siteFilePaths: string[]) =>
  new Map(plain(siteFilePaths).map((f) => [f.toLowerCase(), f]));
const isOff = (v: unknown) => v === false || v === 'false';
const listOff = (m: Meta) => m?.list === false || m?.list === 'false';

/**
 * Is this `layout: list` host a feed of posts? It must list its own folder
 * (not some other one), and look like a feed: not the people view, sorted by
 * date. A catalogue (projects by title, a team by `order`) is not posts.
 */
function listsOwnFeed(
  hostPath: string,
  ownDir: string,
  meta: Meta,
  files: string[],
  rootDir?: string,
): boolean {
  const parsed = parseListingSpec(meta?.list, {
    source: 'layout',
    defaultFrom: ownDir,
    rootDir,
  });
  if (
    parsed.ok &&
    (parsed.spec.view === 'people' || parsed.spec.sort.field !== 'date')
  )
    return false;
  const from = parsed.ok
    ? { from: parsed.spec.from, relative: parsed.spec.fromRelative }
    : (parsed.from ?? { from: ownDir, relative: false });
  const joined = from.relative
    ? [dirOf(hostPath), from.from].filter(Boolean).join('/')
    : from.from;
  return resolveFolderCase(joined, files) === ownDir;
}

export function findPostCollection({
  pagePath,
  siteFilePaths,
  hosts,
  rootDir,
}: {
  pagePath: string;
  siteFilePaths: string[];
  hosts: Record<string, Meta>;
  rootDir?: string;
}): PostCollection | null {
  const files = plain(siteFilePaths);
  const byLower = lowerIndex(siteFilePaths);
  for (const dir of ancestorDirs(pagePath)) {
    const own = hostsOf(dir, byLower);
    // `postLayout: false` on a folder's index or folder note keeps its pages as they are
    if (own.some((h) => isOff(hosts[h]?.postLayout))) continue;
    const listHost = own.find((h) => hosts[h]?.layout === 'list');
    if (listHost) {
      if (listsOwnFeed(listHost, dir, hosts[listHost], files, rootDir))
        return {
          dir,
          options: hosts[listHost]?.list,
          source: 'layout',
          hostPath: listHost,
        };
      continue;
    }
    if (!isAutoListingDirName(dir)) continue;
    const primary = own[0] ?? null;
    const meta = primary ? hosts[primary] : null;
    if (listOff(meta) || (meta?.layout != null && meta.layout !== '')) continue;
    return { dir, options: meta?.list, source: 'auto', hostPath: primary };
  }
  return null;
}

export function resolvePostRoute({
  pagePath,
  metadata,
  siteFilePaths,
  hosts,
  rootDir,
}: {
  pagePath: string;
  metadata: Meta;
  siteFilePaths: string[];
  hosts: Record<string, Meta>;
  rootDir?: string;
}): PostRoute {
  if (!mayBePost(metadata)) return { kind: 'none' };
  const forced = isPostLayout(metadata?.layout);
  const collection = findPostCollection({
    pagePath,
    siteFilePaths,
    hosts,
    rootDir,
  });
  if (forced) return { kind: 'post', collection };
  // A page-level listing (a collection's own index or folder note) is never a
  // post: ancestors start above a folder index, and the route checks
  // resolveListingRoute before this.
  return collection ? { kind: 'post', collection } : { kind: 'none' };
}

/**
 * The eyebrow is the breadcrumb trail above the post. A README-less blog
 * folder is not a page in the site tree, so its crumb has no link; point it
 * at the folder's generated listing page (the same URL as the virtual route).
 */
export function linkCollectionCrumb<
  T extends { label: string; href: string | null },
>(crumbs: T[], collection: PostCollection | null, section?: unknown): T[] {
  if (!collection || (typeof section === 'string' && section.trim()))
    return crumbs;
  const i = collection.dir.split('/').length - 1;
  const crumb = crumbs[i];
  if (!crumb || crumb.href) return crumbs;
  const href = encodeSlug(filePathToSlug(`${collection.dir}/index.md`));
  return crumbs.map((c, j) => (j === i ? { ...c, href } : c));
}
