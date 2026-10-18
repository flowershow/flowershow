import prisma from '@/server/db';

/**
 * Durable fixed-window counters, shared by the OAuth endpoints and the MCP
 * anonymous-publish limits. One row per (key, window) in the rate-limit table
 * (Prisma model OAuthRateLimit, named for its first user); the increment is a
 * single INSERT ... ON CONFLICT (Prisma native upsert), so concurrent
 * requests on different serverless instances count correctly.
 */

/**
 * Count one hit on `key` in the current window and return the window's
 * count including this hit.
 */
export async function hitFixedWindow(
  key: string,
  windowMs: number,
  now = new Date(),
): Promise<number> {
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  const rowKey = `${key}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);
  const row = await prisma.oAuthRateLimit.upsert({
    where: { key: rowKey },
    create: { key: rowKey, count: 1, expiresAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  // Sweep old windows now and then; the table only needs the current ones.
  if (Math.random() < 0.02) {
    prisma.oAuthRateLimit
      .deleteMany({ where: { expiresAt: { lt: now } } })
      .catch(() => {});
  }
  return row.count;
}
