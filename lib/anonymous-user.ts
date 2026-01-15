import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

/**
 * Anonymous user ID for sites created without authentication
 * This matches the ID created by the Prisma migration
 */
export const ANONYMOUS_USER_ID = 'anon000000000000000000000000';

/**
 * Anonymous username for display purposes
 */
export const ANONYMOUS_USERNAME = 'anonymous';

/**
 * JWT secret for anonymous ownership tokens
 * In production, this should be a strong secret from environment variables
 */
const ANONYMOUS_JWT_SECRET =
  process.env.ANONYMOUS_JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'fallback-secret-change-in-production';

/**
 * Generate a unique anonymous owner ID
 */
export function generateAnonymousOwnerId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate an ownership token for an anonymous site
 * This token proves ownership without authentication
 */
export function generateOwnershipToken(
  siteId: string,
  anonymousOwnerId: string,
): string {
  return jwt.sign(
    {
      siteId,
      anonymousOwnerId,
      type: 'anonymous_ownership',
    },
    ANONYMOUS_JWT_SECRET,
    { expiresIn: '8d' }, // 8 days (1 day after default 7-day expiry)
  );
}

/**
 * Verify and decode an ownership token
 */
export function verifyOwnershipToken(token: string): {
  siteId: string;
  anonymousOwnerId: string;
} | null {
  try {
    const decoded = jwt.verify(token, ANONYMOUS_JWT_SECRET) as {
      siteId: string;
      anonymousOwnerId: string;
      type: string;
    };

    if (decoded.type !== 'anonymous_ownership') {
      return null;
    }

    return {
      siteId: decoded.siteId,
      anonymousOwnerId: decoded.anonymousOwnerId,
    };
  } catch (error) {
    return null;
  }
}
