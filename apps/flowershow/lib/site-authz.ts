/**
 * Central authorization for managing a site (settings, publishing, billing,
 * annotations, ...). Not to be confused with `lib/site-access.ts`, which gates
 * *visitors* behind a site password.
 *
 * Today only the site owner (`site.userId`) may manage a site, so both helpers
 * are equivalent. They are separate so that when site collaborators land,
 * `canManageSite` can widen (owner + editors) while `isSiteOwner` stays
 * owner-only for destructive and billing actions.
 *
 * Both are pure predicates. Callers keep control of the failure response
 * (404 vs 403, message) because it differs per surface.
 */

type SiteOwnerFields = { userId: string };

/** True when `userId` is the owner of `site`. A missing user or site is never an owner. */
export function isSiteOwner(
  userId: string | null | undefined,
  site: SiteOwnerFields | null | undefined,
): boolean {
  if (!userId || !site) return false;
  return site.userId === userId;
}

/** True when `userId` may change the site's settings and content. */
export function canManageSite(
  userId: string | null | undefined,
  site: SiteOwnerFields | null | undefined,
): boolean {
  return isSiteOwner(userId, site);
}
