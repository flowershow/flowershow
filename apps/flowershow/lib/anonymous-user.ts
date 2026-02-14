import jwt from 'jsonwebtoken';
import { env } from '@/env.mjs';

// Re-export constants for backward compatibility
export {
  ANONYMOUS_TOKEN_KEY,
  ANONYMOUS_USER_ID,
  ANONYMOUS_USER_ID_KEY,
  ANONYMOUS_USERNAME,
  isValidAnonymousUserId,
} from './anonymous-user-constants';

/**
 * JWT secret for anonymous ownership tokens
 * In production, this should be a strong secret from environment variables
 */
const ANONYMOUS_JWT_SECRET = env.ANONYMOUS_JWT_SECRET;

/**
 * Generate an ownership token for an anonymous user
 * This token proves ownership of all sites created by this browser
 *
 * Design: One token per browser (stored in localStorage), reusable across all anonymous sites
 *
 * SERVER-SIDE ONLY
 */
export function generateOwnershipToken(anonymousUserId: string): string {
  return jwt.sign(
    {
      anonymousUserId,
      type: 'anonymous_ownership',
    },
    ANONYMOUS_JWT_SECRET,
    { expiresIn: '30d' }, // 30 days - longer since it's reusable
  );
}

/**
 * Verify and decode an ownership token
 * Returns the anonymousUserId if valid, null otherwise
 *
 * SERVER-SIDE ONLY
 */
export function verifyOwnershipToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, ANONYMOUS_JWT_SECRET) as {
      anonymousUserId: string;
      type: string;
    };

    if (decoded.type !== 'anonymous_ownership') {
      return null;
    }

    return decoded.anonymousUserId;
  } catch (error) {
    return null;
  }
}
