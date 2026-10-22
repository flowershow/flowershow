import { isDraft } from '@/lib/listing/rules';

/**
 * Builds a site's /llms.txt (https://llmstxt.org): an H1 with the site name,
 * the site description as a blockquote, then the site's Markdown pages
 * grouped by top-level folder, each linking to its raw `.md`/`.mdx` source.
 */

/** Hard cap on listed pages, so a huge site can't produce a huge response. */
export const LLMS_TXT_MAX_PAGES = 2000;

export interface LlmsTxtPage {
  /** Blob path relative to the site root, e.g. `docs/setup.md`. */
  path: string;
  metadata: Record<string, unknown> | null;
}

export interface LlmsTxtInput {
  siteName: string;
  siteUrl: string;
  description?: string | null;
  pages: LlmsTxtPage[];
  /** config.json `contentHide` prefixes: hidden pages aren't advertised. */
  contentHide?: string[] | null;
}

const ROOT_PAGES = new Set([
  'readme.md',
  'readme.mdx',
  'index.md',
  'index.mdx',
]);

/** A frontmatter scalar as one line of text; objects and arrays are not text. */
function oneLine(value: unknown): string {
  const text =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  return text.replace(/\s+/g, ' ').trim();
}

function isIndexFile(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  return ROOT_PAGES.has(name);
}

/** True for pages that should be listed: processed, published, not drafts. */
export function isListedPage(
  page: LlmsTxtPage,
  hidePrefixes: string[] = [],
): boolean {
  if (!/\.mdx?$/i.test(page.path)) return false;
  const { metadata } = page;
  if (!metadata) return false;
  if (metadata.publish === false || isDraft(metadata)) return false;
  return !hidePrefixes.some(
    (p) => page.path === p || page.path.startsWith(`${p}/`),
  );
}

function titleOf(page: LlmsTxtPage): string {
  const title = oneLine(page.metadata?.title);
  if (title) return title;
  const file = page.path.slice(page.path.lastIndexOf('/') + 1);
  return file.replace(/\.mdx?$/i, '');
}

/** Folder name as a section heading: `getting-started` → `Getting started`. */
function sectionTitle(folder: string): string {
  const words = folder.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Link text can't contain unbalanced brackets or break the list item. */
function escapeLinkText(text: string): string {
  return text.replace(/([\\[\]])/g, '\\$1');
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/** Sort key: a folder's index page first, then the rest by path. */
function sortKey(path: string): string {
  return isIndexFile(path)
    ? `${path.slice(0, path.lastIndexOf('/') + 1)}\u0000`
    : path;
}

/** The site description: config first, then the home page's frontmatter. */
export function llmsTxtDescription(
  configDescription: string | null | undefined,
  pages: LlmsTxtPage[],
): string {
  const fromConfig = oneLine(configDescription);
  if (fromConfig) return fromConfig;
  const home = pages.find((p) => ROOT_PAGES.has(p.path.toLowerCase()));
  return oneLine(home?.metadata?.description);
}

export function buildLlmsTxt(input: LlmsTxtInput): string {
  const hidePrefixes = (input.contentHide ?? [])
    .filter((p): p is string => typeof p === 'string')
    .map((p) => p.replace(/^\/+/, '').replace(/\/+$/, ''))
    .filter(Boolean);

  const listed = input.pages
    .filter((p) => isListedPage(p, hidePrefixes))
    .sort((a, b) => (sortKey(a.path) < sortKey(b.path) ? -1 : 1));
  const truncated = listed.length > LLMS_TXT_MAX_PAGES;
  const pages = listed.slice(0, LLMS_TXT_MAX_PAGES);

  // Root-level pages first, then one section per top-level folder.
  const sections = new Map<string, LlmsTxtPage[]>();
  for (const page of pages) {
    const slash = page.path.indexOf('/');
    const key = slash === -1 ? '' : page.path.slice(0, slash);
    const group = sections.get(key) ?? [];
    group.push(page);
    sections.set(key, group);
  }

  const siteUrl = input.siteUrl.replace(/\/+$/, '');
  const item = (page: LlmsTxtPage) => {
    const description = oneLine(page.metadata?.description);
    const link = `[${escapeLinkText(titleOf(page))}](${siteUrl}/${encodePath(page.path)})`;
    return `- ${link}${description ? `: ${description}` : ''}`;
  };

  const lines: string[] = [`# ${oneLine(input.siteName) || 'Site'}`, ''];
  const description = oneLine(input.description);
  if (description) lines.push(`> ${description}`, '');
  lines.push(
    'Each link below points to the Markdown source of a page on this site.',
    '',
  );

  const keys = [...sections.keys()].sort((a, b) =>
    a === '' ? -1 : b === '' ? 1 : a.localeCompare(b),
  );
  for (const key of keys) {
    lines.push(`## ${key === '' ? 'Pages' : sectionTitle(key)}`, '');
    for (const page of sections.get(key)!) lines.push(item(page));
    lines.push('');
  }

  if (truncated) {
    lines.push(
      `(Only the first ${LLMS_TXT_MAX_PAGES} pages are listed. See ${siteUrl}/sitemap.xml for every page.)`,
      '',
    );
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
