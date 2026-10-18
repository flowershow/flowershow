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

import { accountResource, anonResource } from '@/lib/oauth/config';
import { s256 } from '@/lib/oauth/params';
import {
  createAuthorizationCode,
  validateOAuthAccessToken,
} from '@/lib/oauth/tokens';
import { oauthRewritePath } from '@/middleware';
import { POST as register } from './register/route';
import { POST as revoke } from './revoke/route';
import { OPTIONS as tokenOptions, POST as token } from './token/route';
import { GET as asMetadata } from './well-known/oauth-authorization-server/route';
import { GET as prMetadata } from './well-known/oauth-protected-resource/[[...path]]/route';
import { GET as oidcMetadata } from './well-known/openid-configuration/route';

const ISSUER = 'http://test.localhost';
const VERIFIER = 'v'.repeat(50);
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';

let ipCounter = 0;
function post(
  path: string,
  body: string,
  contentType: string,
  headers: Record<string, string> = {},
) {
  return new NextRequest(`${ISSUER}${path}`, {
    method: 'POST',
    body,
    headers: {
      'content-type': contentType,
      'x-forwarded-for': `203.0.113.${ipCounter}`,
      ...headers,
    },
  });
}
const form = (
  path: string,
  params: Record<string, string>,
  headers: Record<string, string> = {},
) =>
  post(
    path,
    new URLSearchParams(params).toString(),
    'application/x-www-form-urlencoded',
    headers,
  );
const json = (
  path: string,
  params: unknown,
  headers: Record<string, string> = {},
) => post(path, JSON.stringify(params), 'application/json', headers);

async function registerClient() {
  const res = await register(
    json('/oauth/register', {
      client_name: 'Claude',
      redirect_uris: [REDIRECT],
    }),
  );
  expect(res.status).toBe(201);
  return (await res.json()).client_id as string;
}

async function issueCode(clientId: string) {
  const client = await db.oAuthClient.findUnique({ where: { clientId } });
  const grant = await db.oAuthGrant.create({
    data: {
      userId: 'user-1',
      clientId: client!.id,
      scope: 'sites:write',
      resource: accountResource(),
      redirectUri: REDIRECT,
    },
  });
  return createAuthorizationCode({
    grantId: grant!.id,
    codeChallenge: s256(VERIFIER),
    redirectUri: REDIRECT,
  });
}

beforeEach(() => {
  db.reset();
  enabled.value = true;
  ipCounter++;
});

describe('metadata', () => {
  it('serves RFC 8414 authorization server metadata', async () => {
    const res = await asMetadata();
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const m = await res.json();
    expect(m).toMatchObject({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      token_endpoint: `${ISSUER}/oauth/token`,
      registration_endpoint: `${ISSUER}/oauth/register`,
      revocation_endpoint: `${ISSUER}/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['sites:write'],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    });
    // ChatGPT requests any OIDC scopes it sees; Claude adds offline_access if listed.
    expect(m.scopes_supported).not.toContain('openid');
    expect(m.scopes_supported).not.toContain('offline_access');
    expect(m).not.toHaveProperty('id_token_signing_alg_values_supported');
  });

  it('serves the same document as openid-configuration', async () => {
    expect(await (await oidcMetadata()).json()).toEqual(
      await (await asMetadata()).json(),
    );
  });

  it.each([
    [[], accountResource()],
    [['api', 'mcp', 'account'], accountResource()],
    [['api', 'mcp'], anonResource()],
  ])('serves protected resource metadata for %j', async (path, resource) => {
    const res = await prMetadata(new Request(ISSUER), {
      params: Promise.resolve({ path }),
    });
    expect(await res.json()).toEqual({
      resource,
      authorization_servers: [ISSUER],
      scopes_supported: ['sites:write'],
      bearer_methods_supported: ['header'],
      resource_name: 'Flowershow',
      resource_documentation: `${ISSUER}/docs/agents/mcp`,
    });
  });

  it('404s protected resource metadata for other paths', async () => {
    const res = await prMetadata(new Request(ISSUER), {
      params: Promise.resolve({ path: ['api', 'sites'] }),
    });
    expect(res.status).toBe(404);
  });
});

describe('switched off (MCP_OAUTH_ENABLED unset)', () => {
  it('404s every endpoint and does not rewrite', async () => {
    enabled.value = false;
    expect((await asMetadata()).status).toBe(404);
    expect((await oidcMetadata()).status).toBe(404);
    expect(
      (
        await prMetadata(new Request(ISSUER), {
          params: Promise.resolve({ path: [] }),
        })
      ).status,
    ).toBe(404);
    expect(
      (await register(json('/oauth/register', { redirect_uris: [REDIRECT] })))
        .status,
    ).toBe(404);
    expect(
      (await token(form('/oauth/token', { grant_type: 'refresh_token' })))
        .status,
    ).toBe(404);
    expect((await revoke(form('/oauth/revoke', { token: 'x' }))).status).toBe(
      404,
    );
    expect(oauthRewritePath('/oauth/token')).toBeNull();
    expect(
      oauthRewritePath('/.well-known/oauth-authorization-server'),
    ).toBeNull();
    expect(db.tables.oAuthClient.size).toBe(0);
  });
});

describe('middleware rewrites (home domain)', () => {
  it.each([
    [
      '/.well-known/oauth-authorization-server',
      '/api/oauth/well-known/oauth-authorization-server',
    ],
    [
      '/.well-known/openid-configuration',
      '/api/oauth/well-known/openid-configuration',
    ],
    [
      '/.well-known/oauth-protected-resource',
      '/api/oauth/well-known/oauth-protected-resource',
    ],
    [
      '/.well-known/oauth-protected-resource/api/mcp/account',
      '/api/oauth/well-known/oauth-protected-resource/api/mcp/account',
    ],
    [
      '/.well-known/oauth-protected-resource/api/mcp',
      '/api/oauth/well-known/oauth-protected-resource/api/mcp',
    ],
    ['/oauth/token', '/api/oauth/token'],
    ['/oauth/register', '/api/oauth/register'],
    ['/oauth/revoke', '/api/oauth/revoke'],
    ['/oauth/authorize', '/api/oauth/authorize'],
  ])('%s -> %s', (from, to) => {
    expect(oauthRewritePath(from)).toBe(to);
  });

  it.each([
    '/oauth',
    '/oauth/other',
    '/.well-known/security.txt',
    '/.well-known/oauth-protected-resource/x',
    '/api/oauth/token',
  ])('leaves %s alone', (p) => {
    expect(oauthRewritePath(p)).toBeNull();
  });
});

describe('POST /oauth/register', () => {
  it('registers a public client', async () => {
    const res = await register(
      json('/oauth/register', {
        client_name: 'MCP Inspector',
        redirect_uris: ['http://localhost:6274/oauth/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({
      client_id: expect.stringMatching(/^dcr_/),
      client_name: 'MCP Inspector',
      redirect_uris: ['http://localhost:6274/oauth/callback'],
      token_endpoint_auth_method: 'none',
    });
    expect(body).not.toHaveProperty('client_secret');
  });

  it('refuses confidential clients and bad redirect URIs', async () => {
    const a = await register(
      json('/oauth/register', {
        redirect_uris: [REDIRECT],
        token_endpoint_auth_method: 'client_secret_basic',
      }),
    );
    expect(a.status).toBe(400);
    expect((await a.json()).error).toBe('invalid_client_metadata');
    const b = await register(
      json('/oauth/register', { redirect_uris: ['http://evil.example/cb'] }),
    );
    expect((await b.json()).error).toBe('invalid_redirect_uri');
  });

  it('requires JSON', async () => {
    const res = await register(
      form('/oauth/register', { redirect_uris: REDIRECT }),
    );
    expect(res.status).toBe(400);
  });

  it('is rate limited to 10 per hour per IP', async () => {
    const body = { redirect_uris: [REDIRECT] };
    for (let i = 0; i < 10; i++) {
      expect((await register(json('/oauth/register', body))).status).toBe(201);
    }
    const limited = await register(json('/oauth/register', body));
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toBe('invalid_request');
    // Another IP is unaffected.
    expect(
      (
        await register(
          json('/oauth/register', body, { 'x-forwarded-for': '198.51.100.99' }),
        )
      ).status,
    ).toBe(201);
    expect(db.tables.oAuthClient.size).toBe(11);
  });
});

describe('POST /oauth/token', () => {
  it('exchanges a code with a form-encoded body (what Claude sends)', async () => {
    const clientId = await registerClient();
    const code = await issueCode(clientId);
    const res = await token(
      form('/oauth/token', {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: REDIRECT,
        code_verifier: VERIFIER,
        resource: accountResource(),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const body = await res.json();
    expect(body).toMatchObject({
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'sites:write',
    });
    expect(
      await validateOAuthAccessToken(body.access_token, accountResource()),
    ).toMatchObject({
      userId: 'user-1',
    });

    // Refresh with JSON, then the old refresh token is dead.
    const refreshed = await token(
      json('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: body.refresh_token,
        client_id: clientId,
      }),
    );
    expect(refreshed.status).toBe(200);
    const reuse = await token(
      form('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: body.refresh_token,
        client_id: clientId,
      }),
    );
    expect(reuse.status).toBe(400);
    expect((await reuse.json()).error).toBe('invalid_grant');
  });

  it('answers invalid_grant for a reused code', async () => {
    const clientId = await registerClient();
    const code = await issueCode(clientId);
    const params = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: REDIRECT,
      code_verifier: VERIFIER,
    };
    expect((await token(form('/oauth/token', params))).status).toBe(200);
    const again = await token(form('/oauth/token', params));
    expect(again.status).toBe(400);
    expect(await again.json()).toMatchObject({ error: 'invalid_grant' });
  });

  it('rejects unsupported grant types', async () => {
    for (const grant_type of [
      'client_credentials',
      'password',
      'implicit',
      '',
    ]) {
      const res = await token(form('/oauth/token', { grant_type }));
      expect((await res.json()).error).toBe('unsupported_grant_type');
    }
  });

  it('rejects client authentication and client secrets (public clients only)', async () => {
    const a = await token(
      form(
        '/oauth/token',
        { grant_type: 'refresh_token' },
        { authorization: 'Basic eDp5' },
      ),
    );
    expect(a.status).toBe(401);
    // RFC 6749 §5.2: WWW-Authenticate with the scheme the client tried.
    expect(a.headers.get('www-authenticate')).toBe(
      'Basic realm="flowershow", error="invalid_client"',
    );
    const b = await token(
      form('/oauth/token', { grant_type: 'refresh_token', client_secret: 's' }),
    );
    expect(b.status).toBe(401);
    expect((await b.json()).error).toBe('invalid_client');
    expect(b.headers.get('www-authenticate')).toMatch(/^Basic realm=/);
  });

  it('rejects repeated parameters and unknown content types', async () => {
    const a = await token(
      post(
        '/oauth/token',
        'grant_type=refresh_token&grant_type=authorization_code',
        'application/x-www-form-urlencoded',
      ),
    );
    expect((await a.json()).error).toBe('invalid_request');
    const b = await token(post('/oauth/token', 'x', 'text/plain'));
    expect((await b.json()).error).toBe('invalid_request');
  });

  it('is rate limited to 60 per minute per IP', async () => {
    for (let i = 0; i < 60; i++) {
      await token(form('/oauth/token', { grant_type: 'x' }));
    }
    const limited = await token(form('/oauth/token', { grant_type: 'x' }));
    expect(limited.status).toBe(429);
    // Not slow_down (a device-flow code): invalid_request + Retry-After.
    expect((await limited.json()).error).toBe('invalid_request');
    expect(limited.headers.get('retry-after')).toBe('60');
  });

  it('answers CORS preflight', async () => {
    const res = tokenOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('POST /oauth/revoke', () => {
  it('revokes the grant and always answers 200', async () => {
    const clientId = await registerClient();
    const code = await issueCode(clientId);
    const issued = await (
      await token(
        form('/oauth/token', {
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          redirect_uri: REDIRECT,
          code_verifier: VERIFIER,
        }),
      )
    ).json();
    const res = await revoke(
      form('/oauth/revoke', {
        token: issued.refresh_token,
        client_id: clientId,
      }),
    );
    expect(res.status).toBe(200);
    expect(
      await validateOAuthAccessToken(issued.access_token, accountResource()),
    ).toBeNull();
    expect(
      (await revoke(form('/oauth/revoke', { token: 'fs_oat_unknown' }))).status,
    ).toBe(200);
  });

  it('requires a token', async () => {
    expect((await revoke(form('/oauth/revoke', {}))).status).toBe(400);
  });
});
