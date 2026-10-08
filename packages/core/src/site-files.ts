/**
 * Reserved file at the site root whose content replaces the default site
 * footer (Premium). It is stored as a non-page blob: no app path, no
 * metadata, no links, tags or search index.
 */
export const SITE_FOOTER_PATH = '_footer.md';

/**
 * All reserved root-level site-chrome files, as stored on `Blob.path` (no
 * leading `/`). They are never published as pages, and every page listing
 * (sitemap, RSS, sidebar tree, List, home fallback, ...) excludes them. A new
 * chrome file (e.g. `_navbar.md`) only needs appending here.
 */
export const SITE_CHROME_FILES: readonly string[] = [SITE_FOOTER_PATH];

/**
 * True for root-level files that configure site chrome (e.g. `_footer.md`).
 * These files are not published as pages. Matching is exact and
 * case-sensitive; only a leading `/` is ignored.
 */
export function isSiteChromeFile(path: string): boolean {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return SITE_CHROME_FILES.includes(normalized);
}
