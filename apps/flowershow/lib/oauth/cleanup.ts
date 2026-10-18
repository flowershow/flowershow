import { after } from 'next/server';
import prisma from '@/server/db';

/**
 * Opportunistic cleanup of expired OAuth rows (flowershow-3fr.4). There is no
 * cron, so /oauth/authorize, /oauth/token and /oauth/register each schedule a
 * bounded sweep after responding: at most SWEEP_LIMIT rows per table per call,
 * found through the `expiresAt` indexes. Traffic that creates rows also
 * removes them, so the tables stay small.
 */

export const SWEEP_LIMIT = 100;
/** Keep used codes a little past expiry so a replay still revokes the grant. */
export const CODE_GRACE_MS = 60 * 60 * 1000;
/** A registered client that never got a grant in this long is dropped. */
export const UNUSED_CLIENT_MS = 7 * 24 * 60 * 60 * 1000;

export type SweepCounts = {
  pendingRequests: number;
  codes: number;
  tokens: number;
  clients: number;
};

/** Delete up to `limit` rows of each kind that are past their use. */
export async function sweepExpiredOAuthRows(
  now = new Date(),
  limit = SWEEP_LIMIT,
): Promise<SweepCounts> {
  const pending = await prisma.oAuthPendingRequest.findMany({
    where: { expiresAt: { lt: now } },
    select: { id: true },
    take: limit,
  });
  const codes = await prisma.oAuthAuthorizationCode.findMany({
    where: { expiresAt: { lt: new Date(now.getTime() - CODE_GRACE_MS) } },
    select: { codeHash: true },
    take: limit,
  });
  // Refresh tokens are kept until they expire (used ones too: presenting a
  // used one revokes the grant), then they are worthless.
  const tokens = await prisma.oAuthToken.findMany({
    where: { expiresAt: { lt: now } },
    select: { tokenHash: true },
    take: limit,
  });
  // Clients (DCR, or a cached CIMD document) that no user ever authorized.
  // CIMD clients are re-fetched on next use; DCR clients re-register.
  const clients = await prisma.oAuthClient.findMany({
    where: {
      createdAt: { lt: new Date(now.getTime() - UNUSED_CLIENT_MS) },
      grants: { none: {} },
    },
    select: { id: true },
    take: limit,
  });

  const [p, c, t, cl] = await Promise.all([
    pending.length
      ? prisma.oAuthPendingRequest.deleteMany({
          where: { id: { in: pending.map((r) => r.id) } },
        })
      : { count: 0 },
    codes.length
      ? prisma.oAuthAuthorizationCode.deleteMany({
          where: { codeHash: { in: codes.map((r) => r.codeHash) } },
        })
      : { count: 0 },
    tokens.length
      ? prisma.oAuthToken.deleteMany({
          where: { tokenHash: { in: tokens.map((r) => r.tokenHash) } },
        })
      : { count: 0 },
    clients.length
      ? prisma.oAuthClient.deleteMany({
          // Re-check: a grant may have been created since the select.
          where: { id: { in: clients.map((r) => r.id) }, grants: { none: {} } },
        })
      : { count: 0 },
  ]);
  return {
    pendingRequests: p.count,
    codes: c.count,
    tokens: t.count,
    clients: cl.count,
  };
}

/**
 * Run a sweep after the response is sent. Outside a request (unit tests
 * calling handlers directly) `after` throws, and there is nothing to do.
 */
export function scheduleOAuthCleanup(): void {
  try {
    after(() =>
      sweepExpiredOAuthRows().catch((error) => {
        console.error('OAuth cleanup failed', error);
      }),
    );
  } catch {}
}
