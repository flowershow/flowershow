import { encodeSlug, filePathToSlug } from '@flowershow/core';
import matter from 'gray-matter';
import type { Code, Html } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import {
  dirOf,
  entryTitleFromPath,
  isFolderIndexPath,
  normalizeDir,
} from '@/lib/changelog';
import { folderHasPages } from './items';
import {
  implicitListingFrom,
  type ListingView,
  parseListingSpec,
} from './spec';

export const AUTO_LISTING_DIR_NAMES = ['blog', 'posts'] as const;
const MARKDOWN_RE = /\.mdx?$/i;
/** Ingestion's index rule (packages/core filePathToSlug): exact README/index. */
const INGESTION_INDEX_RE = /(?:^|\/)(?:README|index)\.mdx?$/;
const LISTING_LANGS = new Set(['list', 'blog', 'base']);

export type ListingRoute =
  | { kind: 'none' }
  | { kind: 'virtual'; dir: string; title: string }
  | {
      kind: 'page';
      options: unknown;
      defaultFrom: string | null;
      source: 'layout' | 'auto';
      view: ListingView;
      pageSize: number | null;
    };

export function isAutoListingDirName(dir: string): boolean {
  const last = normalizeDir(dir).split('/').pop() ?? '';
  return (AUTO_LISTING_DIR_NAMES as readonly string[]).includes(
    last.toLowerCase(),
  );
}

/** Same AST the plugin sees, so detection and rendering never disagree (tech minor 1). */
export function hasExplicitListing(content: string): boolean {
  let body = content;
  try {
    body = matter(content).content;
  } catch {
    // malformed frontmatter: scan the raw text
  }
  const tree = unified().use(remarkParse).parse(body);
  let found = false;
  visit(tree, (node) => {
    if (found) return;
    if (node.type === 'code' && LISTING_LANGS.has((node as Code).lang ?? ''))
      found = true;
    else if (node.type === 'html' && /<List[\s/>]/.test((node as Html).value))
      found = true;
  });
  return found;
}

const plain = (files: string[]) => files.map((f) => f.replace(/^\/+/, ''));
const folderSlug = (dir: string) =>
  encodeSlug(filePathToSlug(`${dir}/index.md`));

export function virtualListingDir(
  slug: string,
  siteFilePaths: string[],
): string | null {
  const paths = plain(siteFilePaths);
  const dirs = new Set<string>();
  for (const p of paths) {
    if (!MARKDOWN_RE.test(p)) continue;
    const parts = p.split('/').slice(0, -1);
    for (let i = 1; i <= parts.length; i++) {
      const d = parts.slice(0, i).join('/');
      if (isAutoListingDirName(d)) dirs.add(d);
    }
  }
  for (const dir of dirs) {
    if (folderSlug(dir) !== slug) continue;
    if (paths.some((p) => dirOf(p) === dir && INGESTION_INDEX_RE.test(p)))
      return null;
    return dir;
  }
  return null;
}

export function autoListingFor({
  blobPath,
  metadata,
  content,
  siteFilePaths,
}: {
  blobPath: string;
  metadata: Record<string, unknown> | null;
  content: string;
  siteFilePaths: string[];
}): { options: unknown; defaultFrom: string } | null {
  const path = blobPath.replace(/^\/+/, '');
  let dir: string | null = null;
  if (isFolderIndexPath(path)) dir = dirOf(path);
  else {
    const sibling = path.replace(MARKDOWN_RE, '');
    if (
      isAutoListingDirName(sibling) &&
      implicitListingFrom(path, siteFilePaths) === sibling
    )
      dir = sibling; // folder note (case 3)
  }
  if (dir === null || !isAutoListingDirName(dir)) return null;
  // A folder of attachments only would render the "no folder with pages" card on a published page
  if (!folderHasPages(dir, siteFilePaths)) return null;
  if (metadata?.layout) return null;
  if (metadata?.list === false || metadata?.list === 'false') return null;
  if (hasExplicitListing(content)) return null;
  return { options: metadata?.list, defaultFrom: dir };
}

function pageRoute(
  options: unknown,
  defaultFrom: string | null,
  source: 'layout' | 'auto',
): ListingRoute {
  const parsed = parseListingSpec(options, { source: 'layout', defaultFrom });
  return {
    kind: 'page',
    options,
    defaultFrom,
    source,
    view: parsed.ok ? parsed.spec.view : 'list',
    pageSize: parsed.ok ? parsed.spec.pageSize : null,
  };
}

export function resolveListingRoute({
  slug,
  blob,
  metadata,
  content,
  siteFilePaths,
  changelogKind,
}: {
  slug: string;
  blob: { path: string } | null;
  metadata: Record<string, unknown> | null;
  content: string;
  siteFilePaths: string[];
  changelogKind: 'index' | 'entry' | 'file' | null;
}): ListingRoute {
  if (!blob) {
    if (changelogKind) return { kind: 'none' };
    const dir = virtualListingDir(slug, siteFilePaths);
    return dir === null
      ? { kind: 'none' }
      : { kind: 'virtual', dir, title: entryTitleFromPath(dir) };
  }
  if (changelogKind === 'index' || changelogKind === 'file')
    return { kind: 'none' };
  if (metadata?.layout === 'list')
    return pageRoute(
      metadata?.list,
      implicitListingFrom(blob.path, siteFilePaths),
      'layout',
    );
  const auto = autoListingFor({
    blobPath: blob.path,
    metadata,
    content,
    siteFilePaths,
  });
  return auto
    ? pageRoute(auto.options, auto.defaultFrom, 'auto')
    : { kind: 'none' };
}
