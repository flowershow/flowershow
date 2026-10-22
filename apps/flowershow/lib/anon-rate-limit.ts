import { createHmac } from 'node:crypto';
import { env } from '@/env.mjs';
import prisma from '@/server/db';

/** Max anonymous sites one IP may create per rolling hour. Durable across serverless instances. */
export const ANON_CREATE_LIMIT_PER_HOUR = 10;

/**
 * HMAC-SHA256 of a client IP (or other caller key), so rate-limit buckets and
 * abuse reports never store the raw value. Keyed by ANON_IP_HASH_SECRET, so
 * rotating the JWT signing secret doesn't reset limits; falls back to
 * ANONYMOUS_JWT_SECRET until that is set.
 */
export function hashIp(ip: string): string {
  const key = env.ANON_IP_HASH_SECRET || env.ANONYMOUS_JWT_SECRET;
  return createHmac('sha256', key).update(ip).digest('hex');
}

export async function checkAnonCreateLimit(
  ipHash: string,
  now: Date = new Date(),
  limit: number = ANON_CREATE_LIMIT_PER_HOUR,
  db: Pick<typeof prisma, 'site'> = prisma,
): Promise<boolean> {
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const recent = await db.site.count({
    where: { anonCreatorIpHash: ipHash, createdAt: { gt: since } },
  });
  return recent < limit;
}
