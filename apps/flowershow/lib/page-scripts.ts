import * as path from 'path';

/** Maximum number of scripts a page can load via `scripts` frontmatter. */
export const MAX_PAGE_SCRIPTS = 10;

/**
 * Maximum number of `scripts` entries examined per page. Bounds server work
 * (this runs on every uncached render) when a page lists a huge array.
 */
export const MAX_PAGE_SCRIPT_ENTRIES = 100;

// Control characters (incl. tab/newline, which URL parsers silently strip) and
// backslashes (which browsers treat as `/`, so `/\host` becomes `//host`).
const UNSAFE_CHARS = /[\u0000-\u001F\u007F\\]/u;
// Prefixes treated as a URL scheme. Anything else, including a relative path
// whose first segment contains `:` (`v1:app.js`), is treated as a site path,
// which can only ever resolve to a published, percent-encoded same-origin path.
const URL_SCHEME =
  /^(?:https?|javascript|vbscript|data|blob|file|filesystem|ftp|wss?|about|mailto|view-source):/iu;
const PROBE_ORIGIN = 'https://site.invalid';

/**
 * Resolve a page's `scripts` frontmatter into a list of script URLs that are
 * safe to load on that page.
 *
 * Accepts a string or a list of strings. Each entry is either:
 * - a published `.js` file on the site, as a path from the site root
 *   (`/js/a.js`) or relative to the page file (`./a.js`, `../js/a.js`), which
 *   becomes a root-relative, per-segment-encoded path (same origin as the
 *   page); query strings and hashes are ignored; or
 * - an absolute `https://` URL (no credentials).
 *
 * Anything else (other schemes, protocol-relative URLs, backslashes, control
 * characters, non-`.js` site files, unpublished files) is dropped. Duplicates
 * are removed and at most {@link MAX_PAGE_SCRIPTS} are kept, in order. Only
 * the first {@link MAX_PAGE_SCRIPT_ENTRIES} entries are examined, and at most
 * one warning is logged per call.
 *
 * Frontmatter is untrusted input: the output is re-checked so that a site path
 * can never resolve to another origin.
 */
export function resolvePageScripts(
  raw: unknown,
  { pagePath, siteFilePaths }: { pagePath: string; siteFilePaths: string[] },
): string[] {
  const entries = typeof raw === 'string' ? [raw] : raw;
  if (!Array.isArray(entries)) return [];

  const published = new Set(siteFilePaths);
  const out = new Set<string>();
  const unpublished: string[] = [];
  let capped = false;

  const limit = Math.min(entries.length, MAX_PAGE_SCRIPT_ENTRIES);
  for (let i = 0; i < limit; i++) {
    const entry: unknown = entries[i];
    if (typeof entry !== 'string') continue;
    const resolved = resolveEntry(entry, pagePath, published, unpublished);
    if (!resolved) continue;
    out.add(resolved);
    if (out.size === MAX_PAGE_SCRIPTS) {
      capped = i < entries.length - 1;
      break;
    }
  }

  const problems: string[] = [];
  if (unpublished.length > 0) {
    const shown = unpublished
      .slice(0, 3)
      .map((v) => `"${v}"`)
      .join(', ');
    const more =
      unpublished.length > 3 ? ` and ${unpublished.length - 3} more` : '';
    problems.push(`not published, skipped: ${shown}${more}`);
  }
  if (capped) {
    problems.push(`only the first ${MAX_PAGE_SCRIPTS} scripts are loaded`);
  } else if (entries.length > MAX_PAGE_SCRIPT_ENTRIES) {
    problems.push(
      `only the first ${MAX_PAGE_SCRIPT_ENTRIES} entries are examined`,
    );
  }
  if (problems.length > 0) {
    console.warn(`[page-scripts] ${pagePath}: ${problems.join('; ')}`);
  }

  return [...out];
}

function resolveEntry(
  entry: string,
  pagePath: string,
  published: Set<string>,
  unpublished: string[],
): string | null {
  const value = entry.trim();
  if (!value || UNSAFE_CHARS.test(value)) return null;

  if (URL_SCHEME.test(value)) return resolveExternal(value);
  if (value.startsWith('//')) return null;

  return resolveSitePath(value, pagePath, published, unpublished);
}

function resolveExternal(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !url.hostname) return null;
  if (url.username || url.password) return null;
  return url.href;
}

function resolveSitePath(
  value: string,
  pagePath: string,
  published: Set<string>,
  unpublished: string[],
): string | null {
  // Query strings and hashes are not supported on site paths (served files
  // are already cache-busted by content); drop them.
  const pathPart = value.replace(/[?#].*$/su, '');
  if (!pathPart) return null;

  // Decode each segment so `my%20file.js` matches `my file.js`. Re-check the
  // decoded value: `%5C`, `%09` or `%2F` must not smuggle in `\`, tab or `/`.
  let segments: string[];
  try {
    segments = pathPart.split('/').map((s) => decodeURIComponent(s));
  } catch {
    return null;
  }
  if (segments.some((s) => UNSAFE_CHARS.test(s) || s.includes('/'))) {
    return null;
  }
  const decoded = segments.join('/');

  // Normalise both absolute and relative inputs; `..` cannot climb above `/`.
  const base = decoded.startsWith('/')
    ? '/'
    : path.posix.dirname(`/${pagePath.replace(/^\/+/u, '')}`);
  const resolved = path.posix.resolve(base, decoded);

  if (path.posix.extname(resolved).toLowerCase() !== '.js') return null;

  if (!published.has(resolved)) {
    unpublished.push(value);
    return null;
  }

  const encoded = resolved
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');

  // Invariant: a site script is a root-relative path on the page's own origin.
  if (!encoded.startsWith('/') || encoded.startsWith('//')) return null;
  if (new URL(encoded, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return null;

  return encoded;
}
