/**
 * Central authorization for managing a site (settings, publishing,
 * annotations, ...). Not to be confused with `lib/site-access.ts`, which gates
 * *visitors* behind a site password.
 *
 * Two roles exist: the owner (`site.userId`, exactly one) and editors
 * (`SiteMember` rows). An editor may manage a site only while it is on the
 * Premium plan; on a lapsed site they keep their membership but lose access
 * (`lapsed_editor`).
 *
 * `canManageSite` admits the owner and Premium editors. `isSiteOwner` stays
 * owner-only and guards the actions editors never get: custom domain, rootDir,
 * rename, GitHub connect/disconnect, member management, billing and delete.
 *
 * All are pure predicates. Callers keep control of the failure response
 * (404 vs 403, message) because it differs per surface.
 *
 * Edge-safe: only `import type` from Prisma here, no runtime imports.
 */

import type { Plan, Prisma } from '@prisma/client';

type SiteOwnerFields = { userId: string };

/**
 * Fields `canManageSite` / `siteRole` need. `members` should be filtered to the
 * caller (see `siteAuthzSelect`); the predicate matches on `userId` regardless.
 */
export type SiteAuthzFields = {
  userId: string;
  plan: Plan;
  members: ReadonlyArray<{ userId: string }>;
};

export type SiteRole = 'owner' | 'editor' | 'lapsed_editor';

/** Prisma `select` that loads exactly what the predicates need, for `userId`. */
export function siteAuthzSelect(userId: string) {
  return {
    userId: true,
    plan: true,
    members: { where: { userId }, select: { userId: true } },
  } as const satisfies Prisma.SiteSelect;
}

export const PREMIUM_REQUIRED = 'premium_required';
export const PREMIUM_REQUIRED_MESSAGE =
  'This site is shared with you, but its Premium plan has lapsed. Ask the site owner to renew it.';

/** True when `userId` is the owner of `site`. A missing user or site is never an owner. */
export function isSiteOwner(
  userId: string | null | undefined,
  site: SiteOwnerFields | null | undefined,
): boolean {
  if (!userId || !site) return false;
  return site.userId === userId;
}

/** The caller's role on `site`, or null when they have none. */
export function siteRole(
  userId: string | null | undefined,
  site: SiteAuthzFields | null | undefined,
): SiteRole | null {
  if (!userId || !site) return null;
  if (isSiteOwner(userId, site)) return 'owner';
  if (!site.members.some((m) => m.userId === userId)) return null;
  return site.plan === 'PREMIUM' ? 'editor' : 'lapsed_editor';
}

/** True when `userId` may change the site's settings and content. */
export function canManageSite(
  userId: string | null | undefined,
  site: SiteAuthzFields | null | undefined,
): boolean {
  const role = siteRole(userId, site);
  return role === 'owner' || role === 'editor';
}
