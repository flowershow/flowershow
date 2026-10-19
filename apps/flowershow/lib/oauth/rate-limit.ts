import { hashIp } from '@/lib/anon-rate-limit';
import { hitFixedWindow } from '@/lib/fixed-window-limit';
import { getClientIp } from '@/lib/rate-limit';

/** Durable per-IP fixed-window limits for the OAuth endpoints. */

export const OAUTH_LIMITS = {
  register: { limit: 10, windowMs: 60 * 60 * 1000 },
  token: { limit: 60, windowMs: 60 * 1000 },
  authorize: { limit: 30, windowMs: 60 * 1000 },
  revoke: { limit: 60, windowMs: 60 * 1000 },
} as const;

export type OAuthLimitBucket = keyof typeof OAUTH_LIMITS;

/** Returns true when the request is within the limit. */
export async function checkOAuthRateLimit(
  bucket: OAuthLimitBucket,
  headers: Headers,
  now = new Date(),
): Promise<boolean> {
  const { limit, windowMs } = OAUTH_LIMITS[bucket];
  const count = await hitFixedWindow(
    `${bucket}:${hashIp(getClientIp(headers))}`,
    windowMs,
    now,
  );
  return count <= limit;
}
