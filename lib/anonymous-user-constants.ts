/**
 * Shared constants for anonymous user management
 * Can be safely imported by both client and server code
 */

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
 * LocalStorage key for persistent anonymous user ID
 */
export const ANONYMOUS_USER_ID_KEY = 'flowershow_anon_user_id';

/**
 * LocalStorage key for anonymous ownership token
 */
export const ANONYMOUS_TOKEN_KEY = 'flowershow_anon_token';

/**
 * Validate that an anonymousUserId is properly formatted
 * Should be a UUID v4
 */
export function isValidAnonymousUserId(id: string): boolean {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}
