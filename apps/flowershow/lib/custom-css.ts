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
