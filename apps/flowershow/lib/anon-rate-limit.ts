import { createHash } from 'node:crypto';
import { env } from '@/env.mjs';
import prisma from '@/server/db';

/** Max anonymous sites one IP may create per rolling hour. Durable across serverless instances. */
export const ANON_CREATE_LIMIT_PER_HOUR = 10;

export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${ip}${env.ANONYMOUS_JWT_SECRET}`)
    .digest('hex');
}

export async function checkAnonCreateLimit(
  ipHash: string,
  now: Date = new Date(),
  limit: number = ANON_CREATE_LIMIT_PER_HOUR,
): Promise<boolean> {
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const recent = await prisma.site.count({
    where: { anonCreatorIpHash: ipHash, createdAt: { gt: since } },
  });
  return recent < limit;
}
