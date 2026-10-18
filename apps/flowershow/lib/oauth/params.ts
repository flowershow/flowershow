import { createHash, timingSafeEqual } from 'node:crypto';
import { allowedResources, accountResource, SUPPORTED_SCOPES } from './config';

/**
 * Pure validation helpers for the OAuth endpoints: PKCE, scope, resource
 * (RFC 8707) and redirect URIs. No I/O, so every rule is unit tested.
 */

// ── PKCE (RFC 7636), S256 only ──

/** RFC 7636 §4.1/§4.2: 43-128 unreserved characters. */
const PKCE_VALUE = /^[A-Za-z0-9\-._~]{43,128}$/;

/** A valid S256 challenge is base64url(sha256(verifier)): exactly 43 chars. */
export function isValidCodeChallenge(challenge: unknown): challenge is string {
  return typeof challenge === 'string' && /^[A-Za-z0-9_-]{43}$/.test(challenge);
}

export function s256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Verify a code_verifier against a stored S256 code_challenge. */
export function verifyPkce(verifier: unknown, challenge: string): boolean {
  if (typeof verifier !== 'string' || !PKCE_VALUE.test(verifier)) return false;
  const a = Buffer.from(s256(verifier));
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Scope ──

export type ScopeResult = { ok: true; scope: string } | { ok: false };

/**
 * Absent or empty scope defaults to sites:write; any unknown scope is
 * rejected (invalid_scope). Duplicates are collapsed.
 */
export function parseScope(raw: unknown): ScopeResult {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, scope: SUPPORTED_SCOPES.join(' ') };
  }
  if (typeof raw !== 'string') return { ok: false };
  const parts = raw.split(' ').filter(Boolean);
  if (parts.length === 0)
    return { ok: true, scope: SUPPORTED_SCOPES.join(' ') };
  const supported: readonly string[] = SUPPORTED_SCOPES;
  if (!parts.every((p) => supported.includes(p))) return { ok: false };
  return { ok: true, scope: [...new Set(parts)].join(' ') };
}

/** True when every scope in `requested` is within `granted`. */
export function scopeWithin(requested: string, granted: string): boolean {
  const g = new Set(granted.split(' ').filter(Boolean));
  return requested
    .split(' ')
    .filter(Boolean)
    .every((s) => g.has(s));
}

// ── Resource indicator (RFC 8707) ──

export type ResourceResult = { ok: true; resource: string } | { ok: false };

/**
 * The resource must be exactly one of our MCP URLs; absent defaults to the
 * signed-in endpoint. Exact string match (no normalisation), since the
 * resulting token is only accepted by the route whose URL it names.
 */
export function parseResource(raw: unknown): ResourceResult {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, resource: accountResource() };
  }
  if (typeof raw !== 'string') return { ok: false };
  return allowedResources().includes(raw)
    ? { ok: true, resource: raw }
    : { ok: false };
}

// ── Redirect URIs ──

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const MAX_URI_LENGTH = 2000;

function isLoopbackHttp(url: URL): boolean {
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
}

/**
 * Whether a redirect URI may be registered (DCR) or declared (CIMD): an
 * absolute https URL, or http on a loopback host (RFC 8252 §7.3). No
 * fragment, no credentials, no custom schemes.
 */
export function isAllowedRedirectUri(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > MAX_URI_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (uri.includes('#')) return false;
  if (url.username || url.password) return false;
  if (url.protocol === 'https:') return url.hostname !== '';
  return isLoopbackHttp(url);
}

/**
 * Match a redirect_uri from an authorization request against a client's
 * registered URIs: exact string match, except that for http loopback URIs
 * the port is ignored (RFC 8252 §7.3: native clients pick a free port).
 */
export function matchRedirectUri(
  requested: unknown,
  registered: readonly string[],
): boolean {
  if (!isAllowedRedirectUri(requested)) return false;
  if (registered.includes(requested)) return true;
  const req = new URL(requested);
  // Only the port may differ, so the URI must already be in canonical form
  // (no dot segments or other spellings the parser would rewrite).
  if (!isLoopbackHttp(req) || req.href !== requested) return false;
  return registered.some((r) => {
    let reg: URL;
    try {
      reg = new URL(r);
    } catch {
      return false;
    }
    return (
      isLoopbackHttp(reg) &&
      reg.hostname === req.hostname &&
      reg.pathname === req.pathname &&
      reg.search === req.search
    );
  });
}
