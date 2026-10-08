import { createHash } from 'node:crypto';

/**
 * A site's custom stylesheet (`custom.css` at the site root) is linked from
 * every page as `/custom.css?v=<version>` on the page's own origin, and the
 * raw route proxies it with a 200 (never a redirect), so `url()` paths in it
 * resolve against the site root. The version is a hash of the content: the
 * layout links the hash of the bytes it saw, and the route re-hashes the bytes
 * it serves and only marks the response immutable when the two agree.
 */
export const CUSTOM_CSS_PATH = 'custom.css';

const ONE_YEAR_SECONDS = 31_536_000;
const ONE_DAY_SECONDS = 86_400;

/** Short content hash used as the `?v=` cache key and the ETag. */
export function customCssVersion(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/** Whether the CSS loads Google Fonts (the layout then preconnects to them). */
export function usesGoogleFonts(content: string): boolean {
  return /fonts\.googleapis\.com/i.test(content);
}

/** Root-relative href for the stylesheet link; unversioned if unknown. */
export function customCssHref(version: string | null | undefined): string {
  return version
    ? `/${CUSTOM_CSS_PATH}?v=${encodeURIComponent(version)}`
    : `/${CUSTOM_CSS_PATH}`;
}

/**
 * Cache-Control for the proxied stylesheet. Only a request whose `?v=` matches
 * the served content is cached as immutable, so bytes are never cached under
 * a key that doesn't describe them (e.g. during a republish). Password sites
 * are only ever cached privately. Expiring (anonymous) sites are never cached
 * past their expiry.
 */
export function customCssCacheControl({
  versionMatches,
  isPrivate,
  expiresAt,
  now = new Date(),
}: {
  versionMatches: boolean;
  isPrivate: boolean;
  expiresAt?: Date | null;
  now?: Date;
}): string {
  const scope = isPrivate ? 'private' : 'public';
  let maxAge = versionMatches ? ONE_YEAR_SECONDS : 0;
  if (expiresAt) {
    const secondsLeft = Math.floor(
      (expiresAt.getTime() - now.getTime()) / 1000,
    );
    maxAge = Math.max(0, Math.min(maxAge, secondsLeft));
  }
  return maxAge > 0
    ? `${scope}, max-age=${maxAge}, immutable`
    : `${scope}, max-age=0, must-revalidate`;
}

/**
 * CDN-Cache-Control for the proxied stylesheet (honoured by Vercel's edge
 * cache, whose key includes the host and query string; the rewritten target
 * path also names the site). Only a matching `v` on a public, non-temporary
 * site is cached at the edge, and only for a day, so a deleted or
 * re-protected site drops out of the edge cache within a day even on a direct
 * `/api/raw/...` URL (middleware runs before the edge cache, so the friendly
 * `/custom.css` URL is gated immediately). Password and anonymous sites, and
 * stale or missing `v`, return null: browser cache only.
 */
export function customCssCdnCacheControl({
  versionMatches,
  isPrivate,
  isTemporary,
}: {
  versionMatches: boolean;
  isPrivate: boolean;
  isTemporary: boolean;
}): string | null {
  if (!versionMatches || isPrivate || isTemporary) return null;
  return `public, max-age=${ONE_DAY_SECONDS}`;
}

/** Whether an `If-None-Match` header matches the (strong) ETag `"<etag>"`. */
export function etagMatches(
  ifNoneMatch: string | null | undefined,
  etag: string,
): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(',')
    .map((t) => t.trim())
    .some((t) => t === '*' || t.replace(/^W\//, '') === `"${etag}"`);
}
