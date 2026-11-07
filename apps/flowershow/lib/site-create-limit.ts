import { hitFixedWindow } from '@/lib/fixed-window-limit';

/** Signed-in users may create this many new sites per hour. */
export const SITE_CREATE_LIMIT_PER_HOUR = 20;

export const SITE_CREATE_LIMIT_MESSAGE = `You've created ${SITE_CREATE_LIMIT_PER_HOUR} sites in the last hour. Try again later, or get in touch if you need more.`;

/**
 * Count one site creation for `userId` and say whether it is within the
 * hourly limit. Call immediately before creating the site.
 */
export async function siteCreateAllowed(userId: string): Promise<boolean> {
  const count = await hitFixedWindow(`site-create:${userId}`, 3_600_000);
  return count <= SITE_CREATE_LIMIT_PER_HOUR;
}
