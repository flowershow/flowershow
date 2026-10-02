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

export const CLAIM_TOKEN_PREFIX = 'fs_claim_';

/**
 * Site-scoped claim token: proves the bearer may update (while anonymous) and
 * claim exactly one anonymous site. Safe to put in a URL, unlike the
 * browser-wide ownership token above. SERVER-SIDE ONLY.
 */
export function generateSiteClaimToken(
  siteId: string,
  anonymousUserId: string,
): string {
  const jwtToken = jwt.sign(
    { type: 'site_claim', siteId, anonymousUserId },
    ANONYMOUS_JWT_SECRET,
    { expiresIn: '7d' },
  );
  return `${CLAIM_TOKEN_PREFIX}${jwtToken}`;
}

/**
 * Verify a site claim token's signature and shape. JWT expiry is deliberately
 * ignored: the site's `expiresAt` in the database is the single source of
 * truth, so callers can tell an expired site (410) from a bad token (401).
 */
export function verifySiteClaimToken(
  token: string,
): { siteId: string; anonymousUserId: string } | null {
  if (!token.startsWith(CLAIM_TOKEN_PREFIX)) return null;
  try {
    const decoded = jwt.verify(
      token.slice(CLAIM_TOKEN_PREFIX.length),
      ANONYMOUS_JWT_SECRET,
      { ignoreExpiration: true },
    ) as {
      type?: string;
      siteId?: string;
      anonymousUserId?: string;
    };
    if (
      decoded.type !== 'site_claim' ||
      !decoded.siteId ||
      !decoded.anonymousUserId
    )
      return null;
    return { siteId: decoded.siteId, anonymousUserId: decoded.anonymousUserId };
  } catch {
    return null;
  }
}

export function buildClaimUrl(siteId: string, claimToken: string): string {
  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';
  // The token goes in the fragment so it never reaches server logs, proxies or
  // the login callbackUrl; the claim page reads it client-side.
  const query = new URLSearchParams({ siteId });
  const fragment = new URLSearchParams({ token: claimToken });
  return `${protocol}://${env.NEXT_PUBLIC_HOME_DOMAIN}/claim?${query}#${fragment}`;
}
