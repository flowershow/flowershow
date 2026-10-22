/**
 * Metadata `robots` for anonymous (temporary) sites: never indexed.
 * Uses the same condition as the anonymous-site banner in the site layout.
 * Spread it LAST into the returned metadata so nothing overrides it.
 */
export function anonRobots(site: {
  isTemporary?: boolean | null;
  anonymousOwnerId?: string | null;
}): { robots?: { index: false; follow: false } } {
  return site.isTemporary && site.anonymousOwnerId
    ? { robots: { index: false, follow: false } }
    : {};
}

/**
 * True for a temporary site whose expiry has passed. Such sites stop being
 * served (404) before the cleanup cron deletes them.
 */
export function isExpiredTemporarySite(
  site: { isTemporary?: boolean | null; expiresAt?: Date | null },
  now: Date = new Date(),
): boolean {
  return !!(
    site.isTemporary &&
    site.expiresAt &&
    site.expiresAt.getTime() <= now.getTime()
  );
}

/**
 * Response headers for a site's non-HTML responses (sitemap, RSS): anonymous
 * sites are never indexed. Same condition as anonRobots.
 */
export function anonRobotsHeaders(site: {
  isTemporary?: boolean | null;
  anonymousOwnerId?: string | null;
}): Record<string, string> {
  return site.isTemporary && site.anonymousOwnerId
    ? { 'X-Robots-Tag': 'noindex' }
    : {};
}
