/**
 * Reserved HTML file at the site root whose content replaces the default site
 * footer (Premium). Like any `.html` file it is stored as a plain, non-page
 * blob (no app path, metadata, links, tags or search index), and it is never
 * served at its own URL.
 */
export const SITE_FOOTER_PATH = '_footer.html';

/**
 * All reserved root-level site-chrome files, as stored on `Blob.path` (no
 * leading `/`). Custom site chrome is HTML-only. These files are never served
 * as pages or raw files, and page listings (sidebar tree, home-page fallback)
 * exclude them. A new chrome file (e.g. `_navbar.html`) only needs appending
 * here.
 */
export const SITE_CHROME_FILES: readonly [string, ...string[]] = [
  SITE_FOOTER_PATH,
];

/**
 * True for reserved root-level site-chrome files (see `SITE_CHROME_FILES`).
 * Matching is exact and case-sensitive; only a leading `/` is ignored, so
 * `_Footer.html` and `docs/_footer.html` are ordinary files.
 */
export function isSiteChromeFile(path: string): boolean {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return SITE_CHROME_FILES.includes(normalized);
}
