import prisma from '@/server/db';
import { clientIdentity, redirectHostLabel } from './authorize';
import { revokeGrant } from './tokens';

/**
 * "Connected apps" on the dashboard tokens page (flowershow-3fr.4): the
 * user's active OAuth grants, and revoking one.
 */

export type ConnectedApp = {
  id: string;
  name: string;
  /** CIMD: the client_id URL's host. DCR: where it redirects to. */
  host: string;
  userHosted: boolean;
  scope: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export async function listConnectedApps(
  userId: string,
): Promise<ConnectedApp[]> {
  const grants = await prisma.oAuthGrant.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      scope: true,
      redirectUri: true,
      createdAt: true,
      lastUsedAt: true,
      client: { select: { name: true, clientId: true, kind: true } },
    },
  });
  return grants.map((g) => {
    const identity = clientIdentity(g.client);
    let host = identity?.host;
    if (!host) {
      try {
        host = redirectHostLabel(g.redirectUri);
      } catch {
        host = '';
      }
    }
    return {
      id: g.id,
      name: g.client.name,
      host,
      userHosted: identity?.userHosted ?? false,
      scope: g.scope,
      createdAt: g.createdAt,
      lastUsedAt: g.lastUsedAt,
    };
  });
}

/**
 * Revoke one of the user's grants and delete all its tokens and codes: the
 * app's next MCP call gets 401 and it must ask the user to sign in again.
 * False when the grant isn't the user's or is already revoked.
 */
export async function revokeUserGrant(
  userId: string,
  grantId: string,
  now = new Date(),
): Promise<boolean> {
  const grant = await prisma.oAuthGrant.findFirst({
    where: { id: grantId, userId, revokedAt: null },
    select: { id: true },
  });
  if (!grant) return false;
  await revokeGrant(grant.id, now);
  return true;
}
