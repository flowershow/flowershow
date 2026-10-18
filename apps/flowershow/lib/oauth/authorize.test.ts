import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb as db } from './fake-db';

vi.mock('@/server/db', async () => ({
  default: (await import('./fake-db')).fakeDb,
}));

import {
  clientIdentity,
  decideAuthorization,
  isBoundToBrowser,
  loadPendingRequest,
  redirectHostLabel,
  startAuthorization,
} from './authorize';
import { registerDcrClient } from './clients';
import {
  accountResource,
  anonResource,
  cloudOrigin,
  oauthIssuer,
} from './config';
import { s256 } from './params';
import { exchangeAuthorizationCode } from './tokens';

const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const VERIFIER = 'k'.repeat(64);
const CHALLENGE = s256(VERIFIER);
const T0 = new Date('2026-10-18T10:00:00Z');

let clientId: string;

beforeEach(async () => {
  db.reset();
  const r = await registerDcrClient({
    client_name: 'Claude',
    redirect_uris: [REDIRECT, 'http://localhost:3000/callback'],
  });
  if (!r.ok) throw new Error('setup');
  clientId = r.client.clientId;
});

const query = (over: Record<string, string | undefined> = {}) => {
  const base: Record<string, string | undefined> = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: CHALLENGE,
    code_challenge_method: 'S256',
    state: 'xyz-state',
    scope: 'sites:write',
    resource: accountResource(),
    ...over,
  };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v !== undefined) q.set(k, v);
  return q;
};

const params = (location: string) => new URL(location).searchParams;

async function pendingIdFor(over: Record<string, string | undefined> = {}) {
  const out = await startAuthorization(query(over), { now: T0 });
  if (out.kind !== 'redirect' || !out.location.startsWith(cloudOrigin())) {
    throw new Error(`unexpected ${JSON.stringify(out)}`);
  }
  const id = params(out.location).get('req') as string;
  if (out.binding?.pendingId !== id) throw new Error('no binding');
  secrets.set(id, out.binding.secret);
  return id;
}

/** The browser-binding cookie /oauth/authorize set for each pending request. */
const secrets = new Map<string, string>();

/** decideAuthorization from the browser that started the request. */
const decide = (
  id: unknown,
  userId: string,
  decision: 'allow' | 'deny',
  now: Date,
) =>
  decideAuthorization(
    id,
    userId,
    decision,
    typeof id === 'string' ? secrets.get(id) : undefined,
    now,
  );

describe('startAuthorization', () => {
  it('parks a valid request and redirects to the consent page on the cloud host', async () => {
    const out = await startAuthorization(query(), { now: T0 });
    expect(out.kind).toBe('redirect');
    if (out.kind !== 'redirect') return;
    const url = new URL(out.location);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${cloudOrigin()}/oauth/consent`,
    );
    const id = url.searchParams.get('req') as string;
    // Unguessable id, the page's only handle on the request.
    expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = db.tables.oAuthPendingRequest.get(id)!;
    expect(row.params).toEqual({
      redirectUri: REDIRECT,
      codeChallenge: CHALLENGE,
      scope: 'sites:write',
      resource: accountResource(),
      state: 'xyz-state',
      bindingHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(row.expiresAt.getTime() - T0.getTime()).toBe(10 * 60 * 1000);
  });

  it('defaults scope and resource when omitted', async () => {
    const id = await pendingIdFor({ scope: undefined, resource: undefined });
    expect(db.tables.oAuthPendingRequest.get(id)!.params).toMatchObject({
      scope: 'sites:write',
      resource: accountResource(),
    });
  });

  it('accepts a loopback redirect on another port', async () => {
    const id = await pendingIdFor({
      redirect_uri: 'http://localhost:61234/callback',
    });
    expect(db.tables.oAuthPendingRequest.get(id)!.params.redirectUri).toBe(
      'http://localhost:61234/callback',
    );
  });

  describe('before the redirect URI is trusted: error page, never a redirect', () => {
    it.each([
      ['unknown client', { client_id: 'dcr_unknown' }],
      ['missing client', { client_id: undefined }],
      [
        'unregistered redirect_uri',
        { redirect_uri: 'https://evil.example/cb' },
      ],
      ['redirect_uri near miss', { redirect_uri: `${REDIRECT}/` }],
      ['missing redirect_uri', { redirect_uri: undefined }],
    ])('%s', async (_n, over) => {
      const out = await startAuthorization(query(over));
      expect(out).toMatchObject({ kind: 'error_page', status: 400 });
      expect(db.tables.oAuthPendingRequest.size).toBe(0);
    });

    it('repeated parameters', async () => {
      const q = query();
      q.append('redirect_uri', 'https://evil.example/cb');
      expect(await startAuthorization(q)).toMatchObject({ kind: 'error_page' });
    });
  });

  describe('after: redirect to the client with error, state and iss', () => {
    it.each([
      ['unsupported_response_type', { response_type: 'token' }],
      ['unsupported_response_type', { response_type: undefined }],
      ['invalid_request', { code_challenge: undefined }],
      ['invalid_request', { code_challenge: 'short' }],
      ['invalid_request', { code_challenge_method: 'plain' }],
      ['invalid_request', { code_challenge_method: undefined }],
      ['invalid_scope', { scope: 'openid' }],
      ['invalid_target', { resource: 'https://evil.example/mcp' }],
      ['invalid_target', { resource: `${accountResource()}/` }],
    ])('%s for %j', async (error, over) => {
      const out = await startAuthorization(query(over));
      expect(out.kind).toBe('redirect');
      if (out.kind !== 'redirect') return;
      expect(out.location.startsWith(`${REDIRECT}?`)).toBe(true);
      const p = params(out.location);
      expect(p.get('error')).toBe(error);
      expect(p.get('state')).toBe('xyz-state');
      expect(p.get('iss')).toBe(oauthIssuer());
      expect(p.get('code')).toBeNull();
      expect(db.tables.oAuthPendingRequest.size).toBe(0);
    });

    it('rejects an oversized state', async () => {
      const out = await startAuthorization(query({ state: 's'.repeat(3000) }));
      expect(out.kind === 'redirect' && params(out.location).get('error')).toBe(
        'invalid_request',
      );
    });
  });
});

describe('decideAuthorization (consent)', () => {
  it('allow: redirects with code, state and iss; the code exchanges for tokens', async () => {
    const id = await pendingIdFor();
    const out = await decide(id, 'user-1', 'allow', T0);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.newGrant).toBe(true);
    const p = params(out.location);
    expect(out.location.startsWith(`${REDIRECT}?`)).toBe(true);
    expect(p.get('state')).toBe('xyz-state');
    expect(p.get('iss')).toBe(oauthIssuer());
    const code = p.get('code') as string;
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const tokens = await exchangeAuthorizationCode(
      {
        code,
        clientId,
        redirectUri: REDIRECT,
        codeVerifier: VERIFIER,
        resource: accountResource(),
      },
      new Date(T0.getTime() + 5000),
    );
    expect(tokens.ok).toBe(true);
    const grant = [...db.tables.oAuthGrant.values()][0]!;
    expect(grant).toMatchObject({
      userId: 'user-1',
      resource: accountResource(),
      scope: 'sites:write',
    });
  });

  it('the code is useless without the PKCE verifier', async () => {
    const id = await pendingIdFor();
    const out = await decide(id, 'user-1', 'allow', T0);
    if (!out.ok) throw new Error('setup');
    const code = params(out.location).get('code') as string;
    const r = await exchangeAuthorizationCode(
      { code, clientId, redirectUri: REDIRECT, codeVerifier: 'z'.repeat(64) },
      T0,
    );
    expect(r).toMatchObject({ ok: false, error: 'invalid_grant' });
  });

  it('deny: redirects with access_denied, state and iss, and creates no grant', async () => {
    const id = await pendingIdFor();
    const out = await decide(id, 'user-1', 'deny', T0);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const p = params(out.location);
    expect(p.get('error')).toBe('access_denied');
    expect(p.get('state')).toBe('xyz-state');
    expect(p.get('iss')).toBe(oauthIssuer());
    expect(p.get('code')).toBeNull();
    expect(db.tables.oAuthGrant.size).toBe(0);
  });

  it('omits state when the client sent none', async () => {
    const id = await pendingIdFor({ state: undefined });
    const out = await decide(id, 'user-1', 'allow', T0);
    expect(out.ok && params(out.location).has('state')).toBe(false);
  });

  it('a pending request can be decided only once', async () => {
    const id = await pendingIdFor();
    expect((await decide(id, 'user-1', 'allow', T0)).ok).toBe(true);
    expect((await decide(id, 'user-1', 'allow', T0)).ok).toBe(false);
    expect((await decide(id, 'user-2', 'deny', T0)).ok).toBe(false);
  });

  it('expires after 10 minutes', async () => {
    const id = await pendingIdFor();
    const late = new Date(T0.getTime() + 10 * 60 * 1000 + 1);
    expect(await loadPendingRequest(id, late)).toBeNull();
    expect((await decide(id, 'user-1', 'allow', late)).ok).toBe(false);
  });

  it('rejects unknown or malformed ids', async () => {
    for (const id of [undefined, '', 'nope', 'x'.repeat(200), 42]) {
      expect((await decide(id, 'user-1', 'allow', T0)).ok).toBe(false);
    }
  });

  it('reuses an active grant for the same user, client, redirect URI, scope and resource', async () => {
    await decide(await pendingIdFor(), 'user-1', 'allow', T0);
    const second = await decide(await pendingIdFor(), 'user-1', 'allow', T0);
    expect(second.ok && second.newGrant).toBe(false);
    expect(db.tables.oAuthGrant.size).toBe(1);
  });

  it('creates a separate grant for another user, resource or redirect URI, or after revocation', async () => {
    await decide(await pendingIdFor(), 'user-1', 'allow', T0);
    await decide(await pendingIdFor(), 'user-2', 'allow', T0);
    await decide(
      await pendingIdFor({ resource: anonResource() }),
      'user-1',
      'allow',
      T0,
    );
    await decide(
      await pendingIdFor({ redirect_uri: 'http://localhost:3000/callback' }),
      'user-1',
      'allow',
      T0,
    );
    expect(db.tables.oAuthGrant.size).toBe(4);
    for (const g of db.tables.oAuthGrant.values()) g.revokedAt = T0;
    const after = await decide(await pendingIdFor(), 'user-1', 'allow', T0);
    expect(after.ok && after.newGrant).toBe(true);
  });
});

describe('redirectHostLabel', () => {
  it('shows the host, and flags loopback apps', () => {
    expect(redirectHostLabel(REDIRECT)).toBe('claude.ai');
    expect(redirectHostLabel('http://127.0.0.1:5555/cb')).toBe(
      '127.0.0.1 (an app on this computer)',
    );
  });
});

describe('browser binding (flowershow-3fr.4)', () => {
  it('stores only a hash of the cookie secret with the pending request', async () => {
    const id = await pendingIdFor();
    const row = db.tables.oAuthPendingRequest.get(id)!;
    const secret = secrets.get(id)!;
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(row.params)).not.toContain(secret);
    const pending = (await loadPendingRequest(id, T0))!;
    expect(isBoundToBrowser(pending, secret)).toBe(true);
    expect(isBoundToBrowser(pending, undefined)).toBe(false);
    expect(isBoundToBrowser(pending, 'x'.repeat(43))).toBe(false);
  });

  it('refuses a decision from another browser and leaves the request usable', async () => {
    const id = await pendingIdFor();
    for (const cookie of [
      undefined,
      '',
      'wrong',
      secrets.get(await pendingIdFor()),
    ]) {
      const out = await decideAuthorization(id, 'user-1', 'allow', cookie, T0);
      expect(out).toMatchObject({
        ok: false,
        message: expect.stringMatching(/different browser/),
      });
    }
    expect(db.tables.oAuthGrant.size).toBe(0);
    expect((await decide(id, 'user-1', 'allow', T0)).ok).toBe(true);
  });
});

describe('clientIdentity', () => {
  it('is the client_id host for CIMD clients, nothing for DCR', () => {
    expect(
      clientIdentity({
        kind: 'CIMD',
        clientId: 'https://claude.ai/oauth/mcp-client.json',
      }),
    ).toEqual({ host: 'claude.ai', userHosted: false });
    expect(clientIdentity({ kind: 'DCR', clientId: 'dcr_abc' })).toBeNull();
  });

  it('flags hosts under the user-site domain (NEXT_PUBLIC_SITE_DOMAIN)', () => {
    // The test env's site domain is test.localhost.
    for (const clientId of [
      'https://test.localhost/client.json',
      'https://alice.test.localhost/client.json',
    ]) {
      expect(clientIdentity({ kind: 'CIMD', clientId })?.userHosted).toBe(true);
    }
    expect(
      clientIdentity({
        kind: 'CIMD',
        clientId: 'https://nottest.localhost/client.json',
      })?.userHosted,
    ).toBe(false);
  });
});
