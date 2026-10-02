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
