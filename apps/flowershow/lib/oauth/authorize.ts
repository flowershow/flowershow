import { randomBytes } from 'node:crypto';
import prisma from '@/server/db';
import {
  type ResolveOptions,
  type ResolvedClient,
  resolveClient,
} from './clients';
import { bindingMatches, hashBinding, newBindingSecret } from './binding';
import { env } from '@/env.mjs';
import { cloudOrigin, oauthIssuer, PENDING_REQUEST_TTL_S } from './config';
import {
  isValidCodeChallenge,
  matchRedirectUri,
  parseResource,
  parseScope,
} from './params';
import { createAuthorizationCode } from './tokens';

/**
 * /oauth/authorize and the consent step (flowershow-3fr.2).
 *
 * Until the redirect URI has been matched against the client's registered
 * URIs, errors are shown on our own error page (never redirected: an
 * unverified redirect_uri would make us an open redirector). After that,
 * errors go back to the client as `error=` on the redirect, with `state` and
 * `iss` (RFC 9207), like every other authorization response.
 */

const MAX_STATE = 2048;

export type PendingParams = {
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string;
  state: string | null;
  /** SHA-256 of the browser-binding cookie set by /oauth/authorize. */
  bindingHash: string;
};

export type AuthorizeOutcome =
  /** Show our error page: the client or redirect URI can't be trusted. */
  | { kind: 'error_page'; status: number; message: string }
  /**
   * Redirect the browser (to the client with an error, or to consent). On
   * the way to consent, `binding` is the cookie to set on that response.
   */
  | {
      kind: 'redirect';
      location: string;
      binding?: { pendingId: string; secret: string };
    };

/** Append authorization response parameters, keeping any existing query. */
export function authorizationRedirect(
  redirectUri: string,
  params: Record<string, string | null | undefined>,
): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) url.searchParams.set(k, v);
  }
  url.searchParams.set('iss', oauthIssuer());
  return url.toString();
}

function errorRedirect(
  redirectUri: string,
  error: string,
  description: string,
  state: string | null,
): AuthorizeOutcome {
  return {
    kind: 'redirect',
    location: authorizationRedirect(redirectUri, {
      error,
      error_description: description,
      state,
    }),
  };
}

/** A 256-bit unguessable id: the consent page's only handle on the request. */
export function newPendingId(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Validate an authorization request and park it as a pending request for the
 * consent page. `query` is the raw query string's params.
 */
export async function startAuthorization(
  query: URLSearchParams,
  opts: ResolveOptions & { now?: Date } = {},
): Promise<AuthorizeOutcome> {
  const now = opts.now ?? new Date();
  // RFC 6749 §3.1: parameters must not be repeated.
  for (const key of new Set(query.keys())) {
    if (query.getAll(key).length > 1) {
      return {
        kind: 'error_page',
        status: 400,
        message: `The ${key} parameter is repeated.`,
      };
    }
  }
  const get = (k: string) => query.get(k) ?? undefined;

  const resolved = await resolveClient(get('client_id'), opts);
  if (!resolved.ok) {
    return {
      kind: 'error_page',
      status: 400,
      message: `This app could not be identified: ${resolved.description}.`,
    };
  }
  const client: ResolvedClient = resolved.client;

  const redirectUri = get('redirect_uri');
  if (!redirectUri || !matchRedirectUri(redirectUri, client.redirectUris)) {
    return {
      kind: 'error_page',
      status: 400,
      message:
        'The redirect_uri does not match any redirect URI registered by this app.',
    };
  }

  // From here on the redirect URI is trusted.
  const rawState = get('state');
  if (rawState !== undefined && rawState.length > MAX_STATE) {
    return errorRedirect(
      redirectUri,
      'invalid_request',
      'state is too long',
      null,
    );
  }
  const state = rawState ?? null;

  if (get('response_type') !== 'code') {
    return errorRedirect(
      redirectUri,
      'unsupported_response_type',
      'Only response_type=code is supported',
      state,
    );
  }
  const challenge = get('code_challenge');
  if (!isValidCodeChallenge(challenge)) {
    return errorRedirect(
      redirectUri,
      'invalid_request',
      'A PKCE code_challenge (S256) is required',
      state,
    );
  }
  if (get('code_challenge_method') !== 'S256') {
    return errorRedirect(
      redirectUri,
      'invalid_request',
      'code_challenge_method must be S256',
      state,
    );
  }
  const scope = parseScope(get('scope'));
  if (!scope.ok) {
    return errorRedirect(
      redirectUri,
      'invalid_scope',
      'Unsupported scope',
      state,
    );
  }
  const resource = parseResource(get('resource'));
  if (!resource.ok) {
    return errorRedirect(
      redirectUri,
      'invalid_target',
      'resource must be a Flowershow MCP endpoint URL',
      state,
    );
  }

  const secret = newBindingSecret();
  const params: PendingParams = {
    redirectUri,
    codeChallenge: challenge,
    scope: scope.scope,
    resource: resource.resource,
    state,
    bindingHash: hashBinding(secret),
  };
  const pending = await prisma.oAuthPendingRequest.create({
    data: {
      id: newPendingId(),
      clientId: client.id,
      params,
      expiresAt: new Date(now.getTime() + PENDING_REQUEST_TTL_S * 1000),
    },
  });
  return {
    kind: 'redirect',
    location: `${cloudOrigin()}/oauth/consent?req=${encodeURIComponent(pending.id)}`,
    binding: { pendingId: pending.id, secret },
  };
}

export type PendingRequest = {
  id: string;
  params: PendingParams;
  client: { id: string; clientId: string; name: string; kind: 'DCR' | 'CIMD' };
};

function isPendingParams(p: unknown): p is PendingParams {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.redirectUri === 'string' &&
    typeof o.codeChallenge === 'string' &&
    typeof o.scope === 'string' &&
    typeof o.resource === 'string' &&
    typeof o.bindingHash === 'string' &&
    (o.state === null || typeof o.state === 'string')
  );
}

/** Load an unexpired pending request (for rendering the consent page). */
export async function loadPendingRequest(
  id: unknown,
  now = new Date(),
): Promise<PendingRequest | null> {
  if (typeof id !== 'string' || !id || id.length > 100) return null;
  const row = await prisma.oAuthPendingRequest.findUnique({ where: { id } });
  if (!row || row.expiresAt.getTime() <= now.getTime()) return null;
  if (!isPendingParams(row.params)) return null;
  const client = await prisma.oAuthClient.findUnique({
    where: { id: row.clientId },
    select: { id: true, clientId: true, name: true, kind: true },
  });
  if (!client) return null;
  return { id: row.id, params: row.params, client };
}

/** True when this browser's binding cookie belongs to the pending request. */
export function isBoundToBrowser(
  pending: PendingRequest,
  cookieValue: string | undefined,
): boolean {
  return bindingMatches(cookieValue, pending.params.bindingHash);
}

/** Delete the pending request; true only for the caller that deleted it. */
async function consumePending(id: string): Promise<boolean> {
  try {
    await prisma.oAuthPendingRequest.delete({ where: { id } });
    return true;
  } catch (error) {
    // P2025: record not found (expired-and-swept, or another request won).
    if ((error as { code?: string } | null)?.code === 'P2025') return false;
    throw error;
  }
}

/**
 * An active grant this user already gave this client for the same redirect
 * URI, scope and resource: a reconnect after token loss skips the consent
 * screen (design decision 7).
 */
export async function findReusableGrant(
  userId: string,
  pending: PendingRequest,
) {
  return prisma.oAuthGrant.findFirst({
    where: {
      userId,
      clientId: pending.client.id,
      redirectUri: pending.params.redirectUri,
      scope: pending.params.scope,
      resource: pending.params.resource,
      revokedAt: null,
    },
    select: { id: true },
  });
}

export const OTHER_BROWSER_MESSAGE =
  'This sign-in request was started in a different browser. Start again from the app, in this browser.';

export type ConsentOutcome =
  | { ok: true; location: string; grantId?: string; newGrant?: boolean }
  | { ok: false; message: string };

/**
 * Finish a pending request for the signed-in user: approve (create or reuse
 * the grant, issue a 60 s single-use code) or deny (access_denied). The
 * pending request is consumed first, so it can be decided only once.
 */
export async function decideAuthorization(
  pendingId: unknown,
  userId: string,
  decision: 'allow' | 'deny',
  binding: string | undefined,
  now = new Date(),
): Promise<ConsentOutcome> {
  const pending = await loadPendingRequest(pendingId, now);
  if (pending && !isBoundToBrowser(pending, binding)) {
    return { ok: false, message: OTHER_BROWSER_MESSAGE };
  }
  if (!pending || !(await consumePending(pending.id))) {
    return {
      ok: false,
      message:
        'This sign-in request has expired or was already used. Start again from the app.',
    };
  }
  const { params } = pending;
  if (decision === 'deny') {
    return {
      ok: true,
      location: authorizationRedirect(params.redirectUri, {
        error: 'access_denied',
        error_description: 'The user declined access',
        state: params.state,
      }),
    };
  }

  const existing = await findReusableGrant(userId, pending);
  const grant =
    existing ??
    (await prisma.oAuthGrant.create({
      data: {
        userId,
        clientId: pending.client.id,
        scope: params.scope,
        resource: params.resource,
        redirectUri: params.redirectUri,
      },
      select: { id: true },
    }));
  const code = await createAuthorizationCode(
    {
      grantId: grant.id,
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
    },
    now,
  );
  return {
    ok: true,
    grantId: grant.id,
    newGrant: !existing,
    location: authorizationRedirect(params.redirectUri, {
      code,
      state: params.state,
    }),
  };
}

/** Host shown on the consent screen for a redirect URI. */
export function redirectHostLabel(redirectUri: string): string {
  const url = new URL(redirectUri);
  if (url.protocol === 'http:')
    return `${url.hostname} (an app on this computer)`;
  return url.host;
}

const bareHost = (host: string) => host.replace(/:\d+$/, '').toLowerCase();

/**
 * Who a client is, for the consent screen and Connected apps. A CIMD client's
 * client_id is the https URL of its metadata document, so its hostname is the
 * one identity Flowershow can vouch for (whoever controls that host published
 * the document). `userHosted` flags hosts under our user-site domain
 * (NEXT_PUBLIC_SITE_DOMAIN), where anyone can publish such a document.
 */
export function clientIdentity(client: {
  clientId: string;
  kind: 'DCR' | 'CIMD';
}): { host: string; userHosted: boolean } | null {
  if (client.kind !== 'CIMD') return null;
  let host: string;
  try {
    host = new URL(client.clientId).hostname.toLowerCase();
  } catch {
    return null;
  }
  const site = bareHost(env.NEXT_PUBLIC_SITE_DOMAIN);
  return { host, userHosted: host === site || host.endsWith(`.${site}`) };
}
