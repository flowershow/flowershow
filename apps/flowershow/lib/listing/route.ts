import { encodeSlug, filePathToSlug } from '@flowershow/core';
import matter from 'gray-matter';
import type { Code, Heading, Html, Root, Text } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import remarkObsidianComments from '@/lib/remark-obsidian-comments';
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
  parseListingBlock,
  parseListingSpec,
} from './spec';

export const AUTO_LISTING_DIR_NAMES = ['blog', 'posts'] as const;
const MARKDOWN_RE = /\.mdx?$/i;
/** Ingestion's index rule (packages/core filePathToSlug): exact README/index. */
const INGESTION_INDEX_RE = /(?:^|\/)(?:README|index)\.mdx?$/;
const LISTING_LANGS = new Set(['list', 'blog', 'base']);
/** A listing fence line, for fences MDX parses inside JSX but remark-parse leaves in an html node. */
const FENCE_IN_HTML_RE =
  /^[ \t]*(?:`{3,}|~{3,})[ \t]*(?:list|blog|base)[ \t]*$/m;

/** An Obsidian Bases embed, `![[Posts.base]]` or `![[Posts.base#View|alias]]`. */
const BASE_EMBED_RE = /!\[\[[^\]|#]+\.base(?:[#|][^\]]*)?\]\]/i;
const LISTING_HTML_RE = /<(?:List|ObsidianBasesViews)[\s/>]/;

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
      /** Newest first by date (not people): what the site's RSS feed holds. */
      chronological: boolean;
    };

export function isAutoListingDirName(dir: string): boolean {
  const last = normalizeDir(dir).split('/').pop() ?? '';
  return (AUTO_LISTING_DIR_NAMES as readonly string[]).includes(
    last.toLowerCase(),
  );
}

/**
 * Same AST the plugin sees, so detection and rendering never disagree (tech
 * minor 1): Obsidian `%% comments %%` are stripped first, as in both pipelines.
 * Obsidian Bases embeds (`![[x.base]]`) and `<ObsidianBasesViews>` count as listings.
 * With `mdx`, a listing fence inside a JSX element counts too (MDX parses JSX
 * children as Markdown; remark-parse keeps them in an html node).
 */
export function hasExplicitListing(
  content: string,
  { mdx = false }: { mdx?: boolean } = {},
): boolean {
  const tree = parseBody(content);
  let found = false;
  visit(tree, (node) => {
    if (found) return;
    if (node.type === 'code' && LISTING_LANGS.has((node as Code).lang ?? ''))
      found = true;
    else if (node.type === 'text') {
      if (BASE_EMBED_RE.test((node as Text).value)) found = true;
    } else if (node.type === 'html') {
      const value = (node as Html).value;
      if (LISTING_HTML_RE.test(value) || (mdx && FENCE_IN_HTML_RE.test(value)))
        found = true;
    }
  });
  return found;
}

/**
 * Whether the body has a ```list / ```blog block that paginates (a valid
 * `pageSize`, no `limit`), so `?page=N` changes the page: generateMetadata
 * cannot see the rendered blocks, so it asks this for the canonical URL. A
 * fence inside an MDX JSX element is not seen (its canonical stays page 1).
 */
export function hasPaginatingBlock(content: string): boolean {
  let found = false;
  visit(parseBody(content), 'code', (node: Code) => {
    if (found || (node.lang !== 'list' && node.lang !== 'blog')) return;
    const parsed = parseListingBlock(node.lang, node.value);
    if (parsed.ok && parsed.spec.pageSize != null) found = true;
  });
  return found;
}

/** The page body as mdast (frontmatter and Obsidian `%% comments %%` removed), as both pipelines see it. */
function parseBody(content: string) {
  let body = content;
  try {
    body = matter(content).content;
  } catch {
    // malformed frontmatter: scan the raw text
  }
  const processor = unified().use(remarkParse).use(remarkObsidianComments);
  return processor.runSync(processor.parse(body));
}

/**
 * Whether a listing page's own body shows anything above the list (so it gets
 * the header's intro slot): not for frontmatter only, blank lines, `%%
 * comments %%` or `<!-- comments -->`.
 */
export function hasIntroText(content: string): boolean {
  return (parseBody(content) as Root).children.some(
    (node) =>
      !(
        node.type === 'html' && /^\s*(?:<!--[\s\S]*?-->\s*)+$/.test(node.value)
      ),
  );
}

/**
 * Whether the page's own content has a heading the ToC lists (h2-h6; listing
 * item headings are data-toc-ignore). A page-level listing without one hides
 * its ToC column, which would otherwise be empty and narrow the grid.
 */
export function hasTocHeadings(content: string): boolean {
  let found = false;
  visit(parseBody(content), (node) => {
    if (found) return;
    if (node.type === 'heading' && (node as Heading).depth >= 2) found = true;
    else if (node.type === 'html' && /<h[2-6][\s>]/i.test((node as Html).value))
      found = true;
  });
  return found;
}

/**
 * Cheap pre-check (no site paths, no body): false means resolveListingRoute
 * returns `none` for this page whatever the site contains, so generateMetadata
 * can skip the site path query on ordinary pages.
 */
export function mayBeListingRoute({
  slug,
  blobPath,
  metadata,
}: {
  slug: string;
  blobPath: string | null;
  metadata: Record<string, unknown> | null;
}): boolean {
  if (blobPath === null) return isAutoListingDirName(slug);
  if (metadata?.layout === 'list') return true;
  const path = blobPath.replace(/^\/+/, '');
  return isFolderIndexPath(path)
    ? isAutoListingDirName(dirOf(path))
    : isAutoListingDirName(path.replace(MARKDOWN_RE, ''));
}

const plain = (files: string[]) => files.map((f) => f.replace(/^\/+/, ''));
/** The URL of a folder's listing page (as ingestion would slug its index). */
export const listingDirSlug = (dir: string) =>
  encodeSlug(filePathToSlug(`${dir}/index.md`));

/** Every blog/posts folder (at any depth) with Markdown pages and no README/index: each gets a generated listing page. */
export function virtualListingDirs(siteFilePaths: string[]): string[] {
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
  return [...dirs].filter(
    (dir) => !paths.some((p) => dirOf(p) === dir && INGESTION_INDEX_RE.test(p)),
  );
}

export function virtualListingDir(
  slug: string,
  siteFilePaths: string[],
): string | null {
  return (
    virtualListingDirs(siteFilePaths).find(
      (dir) => listingDirSlug(dir) === slug,
    ) ?? null
  );
}

/**
 * Whether the page body goes through the MDX pipeline, by the same rule as
 * renderPageContent (which calls it): `syntaxMode` (page frontmatter, then
 * site config) `md` is Markdown, `auto` is Markdown for `.md` only, and
 * anything else, including no setting at all, is MDX.
 */
export function rendersAsMdx(path: string, renderMode?: string): boolean {
  return !(
    renderMode === 'md' ||
    (renderMode === 'auto' && path.endsWith('.md'))
  );
}

export function autoListingFor({
  blobPath,
  metadata,
  content,
  siteFilePaths,
  renderMode,
}: {
  blobPath: string;
  metadata: Record<string, unknown> | null;
  content: string;
  siteFilePaths: string[];
  /** The effective `syntaxMode`, so detection parses the body as rendering will. */
  renderMode?: string;
}): { options: unknown; defaultFrom: string } | null {
  const path = blobPath.replace(/^\/+/, '');
  let dir: string | null = null;
  if (isFolderIndexPath(path)) dir = dirOf(path);
  else if (isAutoListingDirName(path.replace(MARKDOWN_RE, '')))
    dir = implicitListingFrom(path, siteFilePaths); // folder note (case 3), any folder case
  if (dir === null || !isAutoListingDirName(dir)) return null;
  // A folder of attachments only would render the "no folder with pages" card on a published page
  if (!folderHasPages(dir, siteFilePaths)) return null;
  if (metadata?.layout) return null;
  if (metadata?.list === false || metadata?.list === 'false') return null;
  if (hasExplicitListing(content, { mdx: rendersAsMdx(path, renderMode) }))
    return null;
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
    chronological:
      parsed.ok &&
      parsed.spec.view !== 'people' &&
      parsed.spec.sort.field === 'date' &&
      parsed.spec.sort.direction === 'desc',
  };
}

/**
 * The feed to link from a listing page's header. Flowershow has one feed per
 * site (/rss.xml: every published, dated page, newest first), so it is offered
 * on page-level listings that read like it: newest first by date, not a
 * people page. Null when the site has RSS off.
 */
export function listingFeedUrl(
  route: ListingRoute,
  enableRss: boolean | undefined,
): string | null {
  if (!enableRss) return null;
  if (route.kind === 'virtual') return '/rss.xml';
  return route.kind === 'page' && route.chronological ? '/rss.xml' : null;
}

export function resolveListingRoute({
  slug,
  blob,
  metadata,
  content,
  siteFilePaths,
  changelogKind,
  renderMode,
}: {
  slug: string;
  blob: { path: string } | null;
  metadata: Record<string, unknown> | null;
  content: string;
  siteFilePaths: string[];
  changelogKind: 'index' | 'entry' | 'file' | null;
  renderMode?: string;
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
    renderMode,
  });
  return auto
    ? pageRoute(auto.options, auto.defaultFrom, 'auto')
    : { kind: 'none' };
}
