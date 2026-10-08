import * as path from 'path';

/** Maximum number of scripts a page can load via `scripts` frontmatter. */
export const MAX_PAGE_SCRIPTS = 10;

// Control characters (incl. tab/newline, which URL parsers silently strip) and
// backslashes (which browsers treat as `/`, so `/\host` becomes `//host`).
const UNSAFE_CHARS = /[\u0000-\u001F\u007F\\]/u;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/iu;
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
 * are removed and at most {@link MAX_PAGE_SCRIPTS} are kept, in order.
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
  const out: string[] = [];

  for (const entry of entries) {
    if (typeof entry !== 'string') continue;
    const resolved = resolveEntry(entry, pagePath, published);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }

  if (out.length > MAX_PAGE_SCRIPTS) {
    console.warn(
      `[page-scripts] ${pagePath}: only the first ${MAX_PAGE_SCRIPTS} scripts are loaded`,
    );
    return out.slice(0, MAX_PAGE_SCRIPTS);
  }
  return out;
}

function resolveEntry(
  entry: string,
  pagePath: string,
  published: Set<string>,
): string | null {
  const value = entry.trim();
  if (!value || UNSAFE_CHARS.test(value)) return null;

  if (HAS_SCHEME.test(value)) return resolveExternal(value);
  if (value.startsWith('//')) return null;

  return resolveSitePath(value, pagePath, published);
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
    console.warn(
      `[page-scripts] ${pagePath}: script "${value}" is not a published file, skipping`,
    );
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
