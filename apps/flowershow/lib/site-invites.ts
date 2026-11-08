import { randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { env } from '@/env.mjs';
import { hashToken } from '@/lib/cli-auth';

export const MAX_SITE_MEMBERS = 20;
export const MAX_PENDING_INVITES = 20;
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Format: fs_inv_ + 32 random bytes, base64url. */
export function generateInviteToken(): string {
  return `fs_inv_${randomBytes(32).toString('base64url')}`;
}

/** SHA-256 hex, same as access tokens. Only the hash is stored. */
export function hashInviteToken(token: string): string {
  return hashToken(token);
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function inviteUrl(token: string): string {
  const protocol =
    process.env.NODE_ENV === 'development' ? 'http://' : 'https://';
  return `${protocol}${env.NEXT_PUBLIC_CLOUD_DOMAIN}/invite/${token}`;
}

/** Lazy expiry: drop a site's expired invites. There is no scheduled sweep. */
export async function deleteExpiredInvites(
  db: Pick<PrismaClient, 'siteInvite'>,
  siteId: string,
): Promise<void> {
  await db.siteInvite.deleteMany({
    where: { siteId, expiresAt: { lt: new Date() } },
  });
}
