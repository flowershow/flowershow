/**
 * Client-side anonymous user management
 * Handles cookie-persisted anonymous user IDs and tokens for cross-subdomain access
 */

import { env } from '@/env.mjs';
import {
  ANONYMOUS_TOKEN_KEY,
  ANONYMOUS_USER_ID_KEY,
  isValidAnonymousUserId,
} from './anonymous-user-constants';

/**
 * Get the root domain for cross-subdomain cookies
 * Uses NEXT_PUBLIC_HOME_DOMAIN to ensure cookies work across all subdomains
 * Strips port if present and adds leading dot for cross-subdomain support
 */
function getRootDomain(): string {
  // Extract root domain from NEXT_PUBLIC_HOME_DOMAIN (e.g., "flowershow.io" or "flowershow.local")
  const homeDomain = env.NEXT_PUBLIC_HOME_DOMAIN;

  // Remove port if present (e.g., "flowershow.local:3000" -> "flowershow.local")
  const domainWithoutPort = homeDomain.split(':')[0];

  // For localhost, don't set domain attribute
  if (domainWithoutPort === 'localhost') {
    return '';
  }

  // Return with leading dot for cross-subdomain support
  return `.${domainWithoutPort}`;
}

/**
 * Set a cookie with cross-subdomain support
 */
function setCookie(name: string, value: string, days = 365): void {
  if (typeof window === 'undefined') {
    return;
  }

  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;

  const rootDomain = getRootDomain();
  const domain = rootDomain ? `domain=${rootDomain};` : '';

  // Set SameSite=Lax for cross-subdomain access and Secure in production
  const secure = window.location.protocol === 'https:' ? 'Secure;' : '';

  document.cookie = `${name}=${value};${expires};${domain}path=/;SameSite=Lax;${secure}`;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    if (!cookie) continue;

    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }

  return null;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const rootDomain = getRootDomain();
  const domain = rootDomain ? `domain=${rootDomain};` : '';

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;${domain}path=/;`;
}

/**
 * Generate a UUID v4 that works in both secure (HTTPS) and non-secure (HTTP) contexts.
 * crypto.randomUUID() requires HTTPS in browsers, so we fall back to getRandomValues().
 */
function generateUUID(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (HTTP in development)
  const bytes = new Uint8Array(1);
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    crypto.getRandomValues(bytes);
    return (+c ^ (bytes[0]! & (15 >> (+c / 4)))).toString(16);
  });
}

/**
 * Get or create a persistent anonymous user ID for this browser
 * Stored in cross-subdomain cookie to persist across sessions and domains
 *
 * Returns a UUID v4 that uniquely identifies this browser
 */
export function getOrCreateAnonymousUserId(): string {
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateAnonymousUserId can only be called in browser');
  }

  // Try to get existing ID from cookie
  let userId = getCookie(ANONYMOUS_USER_ID_KEY);

  // Validate existing ID
  if (userId && isValidAnonymousUserId(userId)) {
    return userId;
  }

  // Generate new UUID v4
  userId = generateUUID();

  // Store in cross-subdomain cookie
  setCookie(ANONYMOUS_USER_ID_KEY, userId);

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

  const userId = getCookie(ANONYMOUS_USER_ID_KEY);

  if (userId && isValidAnonymousUserId(userId)) {
    return userId;
  }

  return null;
}

/**
 * Store the anonymous ownership token in cross-subdomain cookie
 * This token is reusable across all sites for this browser
 */
export function setAnonymousToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  setCookie(ANONYMOUS_TOKEN_KEY, token);
}

/**
 * Get the stored anonymous ownership token from cookie
 */
export function getAnonymousToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return getCookie(ANONYMOUS_TOKEN_KEY);
}

/**
 * Clear anonymous user data (for testing or logout)
 */
export function clearAnonymousUserData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  deleteCookie(ANONYMOUS_USER_ID_KEY);
  deleteCookie(ANONYMOUS_TOKEN_KEY);
}

/**
 * Check if user has anonymous sites (by checking if they have an ID)
 */
export function hasAnonymousSites(): boolean {
  return getAnonymousUserId() !== null;
}
