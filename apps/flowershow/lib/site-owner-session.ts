import { jwtVerify, SignJWT } from 'jose';
import { env } from '@/env.mjs';
import { normalizeHost } from '@/lib/site-host';

/**
 * Site-scoped owner session (flowershow-1pr.15, spike 1pr.12).
 *
 * The account session cookie lives on `.flowershow.app` and never reaches
 * `*.flowershow.me` or custom domains. Instead the owner goes through a
 * redirect handshake (site host -> cloud host -> site host, see
 * `lib/site-owner-code.ts`) and the site host sets its own cookie: a JWT that
 * says "user U owns site S on host H". It is host-only, HttpOnly, signed with
 * a per-site key that is domain-separated from the password-gate cookie key,
 * and grants owner actions on that one site only.
 *
 * Edge-safe (used by middleware): no Prisma here.
 */

/** Site-host paths of the handshake. Underscore prefix like `/_login`, `/_og`. */
export const OWNER_PATHS = {
  signin: '/_flowershow/owner/signin',
  callback: '/_flowershow/owner/callback',
  me: '/_flowershow/owner/me',
  signout: '/_flowershow/owner/signout',
} as const;

export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function isSecureEnv() {
  return (
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
  );
}

/**
 * `__Host-` makes the browser enforce Secure, Path=/ and no Domain attribute,
 * so the cookie can never be widened to sibling hosts (other users' sites on
 * `*.flowershow.me`). Plain http dev can't set `__Host-` cookies.
 */
export function ownerCookieName() {
  return isSecureEnv() ? '__Host-fs_site_owner' : 'fs_site_owner';
}

/** Attributes for setting (and, with maxAge 0, clearing) the owner cookie. Never a Domain. */
export function ownerCookieAttributes(maxAge = OWNER_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

const AUDIENCE_PREFIX = 'site-owner:';

/**
 * Per-site signing key. Domain-separated from `siteKeyBytes` (the password
 * gate), so a visitor's password cookie can never pass as an owner cookie.
 */
async function ownerKeyBytes(siteId: string) {
  const material = new TextEncoder().encode(
    `${env.SITE_ACCESS_JWT_SECRET}:site-owner:v1:${siteId}`,
  );
  return new Uint8Array(await crypto.subtle.digest('SHA-256', material));
}

export async function signOwnerToken(input: {
  siteId: string;
  userId: string;
  host: string;
}): Promise<string> {
  return new SignJWT({ host: normalizeHost(input.host) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.userId)
    .setAudience(`${AUDIENCE_PREFIX}${input.siteId}`)
    .setIssuedAt()
    .setExpirationTime(`${OWNER_COOKIE_MAX_AGE}s`)
    .sign(await ownerKeyBytes(input.siteId));
}

/**
 * The user id in a valid owner token for this site on this host, else null.
 * Callers must still check the user currently owns the site.
 */
export async function verifyOwnerToken(
  token: string,
  expected: { siteId: string; host: string },
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      await ownerKeyBytes(expected.siteId),
      {
        algorithms: ['HS256'],
        audience: `${AUDIENCE_PREFIX}${expected.siteId}`,
      },
    );
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    const host = normalizeHost(expected.host);
    if (!host || payload.host !== host) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/** The owner cookie's value from a Cookie header. */
export function readOwnerCookie(headers: Headers): string | null {
  const name = ownerCookieName();
  for (const part of (headers.get('cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=') || null;
  }
  return null;
}

/**
 * The user id of the site's current owner if the request carries a valid
 * owner cookie for this site and host. Ownership is re-checked against
 * `site.userId`, so transferring a site revokes old cookies.
 */
export async function getSiteOwnerFromRequest(
  request: Request,
  site: { id: string; userId: string },
): Promise<string | null> {
  const token = readOwnerCookie(request.headers);
  if (!token) return null;
  const userId = await verifyOwnerToken(token, {
    siteId: site.id,
    host: request.headers.get('host') ?? '',
  });
  return userId && userId === site.userId ? userId : null;
}

/**
 * True when a state-changing request comes from a page on the request's own
 * host. The owner cookie is SameSite=Lax, and sibling `*.flowershow.me` sites
 * are "same-site", so SameSite alone doesn't stop another user's site from
 * posting with it; browsers always send Origin on cross-origin POSTs.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return (
      normalizeHost(new URL(origin).host) ===
      normalizeHost(request.headers.get('host'))
    );
  } catch {
    return false;
  }
}

/**
 * A safe same-site return path: starts with a single `/`, no scheme or host,
 * no backslashes or control characters (browsers treat `/\evil.com` as
 * `//evil.com`). Anything else becomes `/`. Never returns an absolute URL.
 */
export function safeReturnPath(raw: string | null | undefined): string {
  if (!raw || raw.length > 2048) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return '/';
  try {
    const base = 'http://return.invalid';
    const url = new URL(raw, base);
    if (url.origin !== base) return '/';
    // Never bounce back into the handshake itself.
    if (url.pathname.startsWith('/_flowershow/owner/')) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
