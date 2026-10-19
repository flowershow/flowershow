import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb as db } from '@/lib/oauth/fake-db';

vi.mock('@/server/db', async () => ({
  default: (await import('@/lib/oauth/fake-db')).fakeDb,
}));
const enabled = vi.hoisted(() => ({ value: true }));
vi.mock('@/lib/oauth/config', async (orig) => ({
  ...(await orig<typeof import('@/lib/oauth/config')>()),
  oauthEnabled: () => enabled.value,
}));
const reqHeaders = vi.hoisted(() => ({ value: new Headers() }));
// The browser's cookies: what /oauth/authorize set, sent to the consent action.
const jar = vi.hoisted(() => ({ value: new Map<string, string>() }));
vi.mock('next/headers', () => ({
  headers: async () => reqHeaders.value,
  cookies: async () => ({
    get: (name: string) =>
      jar.value.has(name) ? { name, value: jar.value.get(name) } : undefined,
    set: (name: string, value: string, opts?: { maxAge?: number }) => {
      if (opts?.maxAge === 0) jar.value.delete(name);
      else jar.value.set(name, value);
    },
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { url });
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
const session = vi.hoisted(() => ({
  value: null as null | { user: { id: string; username: string } },
}));
vi.mock('@/server/auth', () => ({ getSession: async () => session.value }));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}));

import { decideConsent } from '@/app/(cloud)/oauth/consent/actions';
import { bindingCookieName } from '@/lib/oauth/binding';
import { accountResource, cloudOrigin, oauthIssuer } from '@/lib/oauth/config';
import { s256 } from '@/lib/oauth/params';
import { validateOAuthAccessToken } from '@/lib/oauth/tokens';
import { GET as authorizeRoute } from './authorize/route';
import { POST as register } from './register/route';
import { POST as token } from './token/route';

/** GET /oauth/authorize in the test browser: keeps the cookies it sets. */
async function authorize(req: NextRequest) {
  const res = await authorizeRoute(req);
  for (const c of res.cookies.getAll()) jar.value.set(c.name, c.value);
  return res;
}

const ISSUER = 'http://test.localhost';
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const VERIFIER = 'q'.repeat(60);

let ip = 0;
const fromIp = () => ({ 'x-forwarded-for': `198.51.100.${ip}` });

async function registerClient() {
  const res = await register(
    new NextRequest(`${ISSUER}/oauth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...fromIp() },
      body: JSON.stringify({
        client_name: 'Claude',
        redirect_uris: [REDIRECT],
      }),
    }),
  );
  return (await res.json()).client_id as string;
}

function authorizeUrl(clientId: string, over: Record<string, string> = {}) {
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: s256(VERIFIER),
    code_challenge_method: 'S256',
    state: 'st-123',
    resource: accountResource(),
    ...over,
  });
  return new NextRequest(`${ISSUER}/oauth/authorize?${q}`, {
    headers: fromIp(),
  });
}

function consentForm(req: string, decision: 'allow' | 'deny') {
  const f = new FormData();
  f.set('req', req);
  f.set('decision', decision);
  return f;
}

/** Runs the server action and returns the URL it redirected to. */
async function submit(req: string, decision: 'allow' | 'deny') {
  try {
    const state = await decideConsent(null, consentForm(req, decision));
    return { state };
  } catch (e) {
    const url = (e as { url?: string }).url;
    if (!url) throw e;
    return { location: url };
  }
}

beforeEach(() => {
  db.reset();
  ip++;
  jar.value = new Map();
  enabled.value = true;
  session.value = { user: { id: 'user-1', username: 'alice' } };
  reqHeaders.value = new Headers({
    host: 'cloud.test.localhost',
    origin: 'http://cloud.test.localhost',
    'sec-fetch-site': 'same-origin',
  });
});

describe('register -> authorize -> consent -> token', () => {
  it('issues access and refresh tokens that work for the account MCP endpoint', async () => {
    const clientId = await registerClient();

    const authRes = await authorize(authorizeUrl(clientId));
    expect(authRes.status).toBe(302);
    const consentUrl = new URL(authRes.headers.get('location') as string);
    expect(`${consentUrl.origin}${consentUrl.pathname}`).toBe(
      `${cloudOrigin()}/oauth/consent`,
    );
    const req = consentUrl.searchParams.get('req') as string;

    const { location } = await submit(req, 'allow');
    const back = new URL(location as string);
    expect(`${back.origin}${back.pathname}`).toBe(REDIRECT);
    expect(back.searchParams.get('state')).toBe('st-123');
    expect(back.searchParams.get('iss')).toBe(oauthIssuer());
    const code = back.searchParams.get('code') as string;

    const tokenRes = await token(
      new NextRequest(`${ISSUER}/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          ...fromIp(),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          redirect_uri: REDIRECT,
          code_verifier: VERIFIER,
          resource: accountResource(),
        }).toString(),
      }),
    );
    expect(tokenRes.status).toBe(200);
    const body = await tokenRes.json();
    expect(body.access_token).toMatch(/^fs_oat_/);
    expect(body.refresh_token).toMatch(/^fs_ort_/);
    expect(
      await validateOAuthAccessToken(body.access_token, accountResource()),
    ).toMatchObject({
      userId: 'user-1',
      scopes: ['sites:write'],
    });
  });

  it('cancel returns access_denied with state and iss', async () => {
    const clientId = await registerClient();
    const authRes = await authorize(authorizeUrl(clientId));
    const req = new URL(
      authRes.headers.get('location') as string,
    ).searchParams.get('req') as string;
    const { location } = await submit(req, 'deny');
    const back = new URL(location as string);
    expect(back.searchParams.get('error')).toBe('access_denied');
    expect(back.searchParams.get('state')).toBe('st-123');
    expect(back.searchParams.get('iss')).toBe(oauthIssuer());
    expect(db.tables.oAuthGrant.size).toBe(0);
  });
});

describe('GET /oauth/authorize', () => {
  it('shows an error page (no redirect) for an unregistered redirect_uri', async () => {
    const clientId = await registerClient();
    const res = await authorize(
      authorizeUrl(clientId, { redirect_uri: 'https://evil.example/cb' }),
    );
    expect(res.status).toBe(400);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('redirects errors to a trusted redirect_uri with iss', async () => {
    const clientId = await registerClient();
    const res = await authorize(
      authorizeUrl(clientId, { code_challenge_method: 'plain' }),
    );
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get('location') as string);
    expect(loc.searchParams.get('error')).toBe('invalid_request');
    expect(loc.searchParams.get('iss')).toBe(oauthIssuer());
  });

  it('is rate limited to 30 per minute per IP', async () => {
    const clientId = await registerClient();
    for (let i = 0; i < 30; i++) await authorize(authorizeUrl(clientId));
    expect((await authorize(authorizeUrl(clientId))).status).toBe(429);
  });

  it('404s when switched off', async () => {
    enabled.value = false;
    expect((await authorize(authorizeUrl('x'))).status).toBe(404);
  });
});

describe('consent action', () => {
  async function pending() {
    const clientId = await registerClient();
    const res = await authorize(authorizeUrl(clientId));
    return new URL(res.headers.get('location') as string).searchParams.get(
      'req',
    ) as string;
  }

  it('refuses a cross-origin POST', async () => {
    const req = await pending();
    reqHeaders.value = new Headers({
      host: 'cloud.test.localhost',
      origin: 'https://evil.flowershow.app',
      'sec-fetch-site': 'same-site',
    });
    expect(await submit(req, 'allow')).toEqual({
      state: { error: 'Cross-origin request refused.' },
    });
    expect(db.tables.oAuthGrant.size).toBe(0);
  });

  it('refuses a POST with no Origin unless Sec-Fetch-Site vouches for it', async () => {
    const req = await pending();
    reqHeaders.value = new Headers({ host: 'cloud.test.localhost' });
    expect((await submit(req, 'allow')).state).toEqual({
      error: 'Cross-origin request refused.',
    });
  });

  it('requires a session', async () => {
    const req = await pending();
    session.value = null;
    expect((await submit(req, 'allow')).state).toMatchObject({
      error: expect.stringMatching(/sign in/i),
    });
    expect(db.tables.oAuthGrant.size).toBe(0);
  });

  it('can be submitted once', async () => {
    const req = await pending();
    expect((await submit(req, 'allow')).location).toBeTruthy();
    expect((await submit(req, 'allow')).state).toMatchObject({
      error: expect.stringMatching(/expired|used/),
    });
  });
});

describe('browser binding cookie (flowershow-3fr.4)', () => {
  async function pending() {
    const clientId = await registerClient();
    const res = await authorize(authorizeUrl(clientId));
    const req = new URL(res.headers.get('location') as string).searchParams.get(
      'req',
    ) as string;
    return { req, res };
  }

  it('/oauth/authorize sets an HttpOnly cookie scoped to /oauth on the home domain and its subdomains', async () => {
    const { req, res } = await pending();
    const name = bindingCookieName(req);
    const header = res.headers.get('set-cookie') as string;
    expect(header).toContain(`${name}=`);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).toMatch(/Path=\/oauth/);
    // Cloud host cloud.test.localhost is under home domain test.localhost.
    expect(header).toMatch(/Domain=\.?test\.localhost/i);
    expect(header).toMatch(/Max-Age=600/);
    // The secret is not in the URL.
    expect(res.headers.get('location')).not.toContain(
      jar.value.get(name) as string,
    );
  });

  it('refuses a consent POST from a browser without the cookie, and keeps the request for the right one', async () => {
    const { req } = await pending();
    const mine = jar.value;
    jar.value = new Map();
    expect((await submit(req, 'allow')).state).toEqual({
      error: expect.stringMatching(/different browser/),
    });
    expect(db.tables.oAuthGrant.size).toBe(0);
    jar.value = mine;
    expect((await submit(req, 'allow')).location).toMatch(/code=/);
  });

  it('clears the cookie once the request is decided', async () => {
    const { req } = await pending();
    expect(jar.value.has(bindingCookieName(req))).toBe(true);
    await submit(req, 'deny');
    expect(jar.value.has(bindingCookieName(req))).toBe(false);
  });
});

describe('POST /oauth/token refresh with a narrower scope', () => {
  it('issues an access token with the narrower scope; the refresh token keeps its own', async () => {
    const clientId = await registerClient();
    const authRes = await authorize(authorizeUrl(clientId));
    const req = new URL(
      authRes.headers.get('location') as string,
    ).searchParams.get('req') as string;
    const code = new URL(
      (await submit(req, 'allow')).location as string,
    ).searchParams.get('code') as string;
    // Pretend the grant carries two scopes (only one exists today).
    const grant = [...db.tables.oAuthGrant.values()][0]!;
    grant.scope = 'sites:write sites:read';

    const post = (body: Record<string, string>) =>
      token(
        new NextRequest(`${ISSUER}/oauth/token`, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            ...fromIp(),
          },
          body: new URLSearchParams(body).toString(),
        }),
      );
    const first = await (
      await post({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: REDIRECT,
        code_verifier: VERIFIER,
      })
    ).json();
    expect(first.scope).toBe('sites:write sites:read');

    const narrowed = await post({
      grant_type: 'refresh_token',
      refresh_token: first.refresh_token,
      client_id: clientId,
      scope: 'sites:read',
    });
    expect(narrowed.status).toBe(200);
    const second = await narrowed.json();
    expect(second.scope).toBe('sites:read');
    expect(
      (await validateOAuthAccessToken(second.access_token, accountResource()))
        ?.scopes,
    ).toEqual(['sites:read']);

    // Next refresh without scope: back to the refresh token's full scope.
    const third = await (
      await post({
        grant_type: 'refresh_token',
        refresh_token: second.refresh_token,
        client_id: clientId,
      })
    ).json();
    expect(third.scope).toBe('sites:write sites:read');

    // Asking for more than the refresh token carries is refused.
    const wider = await post({
      grant_type: 'refresh_token',
      refresh_token: third.refresh_token,
      client_id: clientId,
      scope: 'sites:write admin',
    });
    expect((await wider.json()).error).toBe('invalid_scope');
  });
});
