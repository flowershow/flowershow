import { hashIp } from '@/lib/anon-rate-limit';
import { getClientIp } from '@/lib/rate-limit';
import prisma from '@/server/db';

/**
 * Durable per-IP fixed-window limits for the OAuth endpoints. One row per
 * (bucket, IP, window); the increment is a single INSERT ... ON CONFLICT
 * (Prisma native upsert), so concurrent requests on different serverless
 * instances count correctly.
 */

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
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  const key = `${bucket}:${hashIp(getClientIp(headers))}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);
  const row = await prisma.oAuthRateLimit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  // Sweep old windows now and then; the table only needs the current ones.
  if (Math.random() < 0.02) {
    prisma.oAuthRateLimit
      .deleteMany({ where: { expiresAt: { lt: now } } })
      .catch(() => {});
  }
  return row.count <= limit;
}
