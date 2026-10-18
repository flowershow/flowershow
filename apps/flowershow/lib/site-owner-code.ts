import 'server-only';
import { Prisma } from '@prisma/client';
import prisma from '@/server/db';

/**
 * One-time codes for the site-owner sign-in handshake (flowershow-1pr.15).
 *
 * Why a random code stored hashed, rather than a signed (HMAC) code plus a
 * nonce table: single use needs server state either way, and once there is a
 * row per code the row *is* the proof. One mechanism instead of two, nothing
 * to sign, and a database leak yields only SHA-256 hashes of 256-bit random
 * values (useless, and expired within a minute anyway). `DELETE ... RETURNING`
 * makes redemption atomic: two concurrent redemptions can't both succeed.
 */

export const OWNER_CODE_TTL_MS = 60 * 1000;

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function hashOwnerCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(code),
  );
  return Buffer.from(digest).toString('hex');
}

/** Issue a code for `userId` on `siteId`. Caller has checked the session and ownership. */
export async function createOwnerCode(
  siteId: string,
  userId: string,
  now = new Date(),
): Promise<string> {
  const code = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  // Sweep expired codes as we go; the table only ever holds a minute's worth.
  await prisma.siteOwnerCode.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.siteOwnerCode.create({
    data: {
      codeHash: await hashOwnerCode(code),
      siteId,
      userId,
      expiresAt: new Date(now.getTime() + OWNER_CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Redeem a code on `siteId`'s host. The code is deleted whatever the outcome
 * (a wrong-site or late attempt burns it too). Returns the user id, or null
 * when the code is unknown, already used, expired or for another site.
 */
export async function consumeOwnerCode(
  code: string | null | undefined,
  siteId: string,
  now = new Date(),
): Promise<string | null> {
  if (!code || code.length > 128) return null;
  let row: { siteId: string; userId: string; expiresAt: Date };
  try {
    row = await prisma.siteOwnerCode.delete({
      where: { codeHash: await hashOwnerCode(code) },
      select: { siteId: true, userId: true, expiresAt: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null; // unknown or already used
    throw error;
  }
  if (row.siteId !== siteId) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;
  return row.userId;
}
