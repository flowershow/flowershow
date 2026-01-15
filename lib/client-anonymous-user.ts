/**
 * Client-side anonymous user management
 * Handles localStorage-persisted anonymous user IDs and tokens
 */

import {
  ANONYMOUS_USER_ID_KEY,
  ANONYMOUS_TOKEN_KEY,
  isValidAnonymousUserId,
} from './anonymous-user-constants';

/**
 * Get or create a persistent anonymous user ID for this browser
 * Stored in localStorage to persist across sessions
 *
 * Returns a UUID v4 that uniquely identifies this browser
 */
export function getOrCreateAnonymousUserId(): string {
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateAnonymousUserId can only be called in browser');
  }

  // Try to get existing ID
  let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);

  // Validate existing ID
  if (userId && isValidAnonymousUserId(userId)) {
    return userId;
  }

  // Generate new UUID v4
  userId = crypto.randomUUID();

  // Store for future use
  localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);

  return userId;
}

/**
 * Get the current anonymous user ID without creating a new one
 * Returns null if no ID exists yet
 */
export function getAnonymousUserId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);

  if (userId && isValidAnonymousUserId(userId)) {
    return userId;
  }

  return null;
}

/**
 * Store the anonymous ownership token
 * This token is reusable across all sites for this browser
 */
export function setAnonymousToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(ANONYMOUS_TOKEN_KEY, token);
}

/**
 * Get the stored anonymous ownership token
 */
export function getAnonymousToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(ANONYMOUS_TOKEN_KEY);
}

/**
 * Clear anonymous user data (for testing or logout)
 */
export function clearAnonymousUserData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ANONYMOUS_USER_ID_KEY);
  localStorage.removeItem(ANONYMOUS_TOKEN_KEY);
}

/**
 * Check if user has anonymous sites (by checking if they have an ID)
 */
export function hasAnonymousSites(): boolean {
  return getAnonymousUserId() !== null;
}
