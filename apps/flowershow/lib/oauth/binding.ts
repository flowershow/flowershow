import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '@/env.mjs';
import { PENDING_REQUEST_TTL_S } from './config';

/**
 * Browser binding for pending authorization requests (flowershow-3fr.4).
 *
 * /oauth/authorize (home domain) sets an HttpOnly cookie holding a random
 * secret; the pending request stores only its SHA-256. The consent page (cloud
 * host) and its server action accept the request only from the browser that
 * carries the cookie, so a consent link sent to someone else is useless: it
 * can't be used to make a signed-in victim approve an attacker's request.
 */

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export function newBindingSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashBinding(secret: string): string {
  return sha256(secret);
}

/** One cookie per pending request, so parallel sign-ins don't clobber each other. */
export function bindingCookieName(pendingId: string): string {
  return `fs_oauth_${sha256(pendingId).slice(0, 16)}`;
}

/** True when `secret` (the cookie value) matches the stored hash. */
export function bindingMatches(
  secret: string | undefined,
  storedHash: string,
): boolean {
  if (!secret || secret.length > 100) return false;
  const a = Buffer.from(hashBinding(secret), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

const hostname = (host: string) => host.replace(/:\d+$/, '').toLowerCase();

/**
 * The cookie must reach both the home domain (where it is set) and the cloud
 * host (where it is read): scope it to the home domain when the cloud host is
 * one of its subdomains (cloud.flowershow.app under flowershow.app), as the
 * session cookie is.
 */
export function bindingCookieDomain(): string | undefined {
  const home = hostname(env.NEXT_PUBLIC_HOME_DOMAIN);
  const cloud = hostname(env.NEXT_PUBLIC_CLOUD_DOMAIN);
  return cloud.endsWith(`.${home}`) ? `.${home}` : undefined;
}

export function bindingCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/oauth',
    domain: bindingCookieDomain(),
    maxAge: PENDING_REQUEST_TTL_S,
  };
}
