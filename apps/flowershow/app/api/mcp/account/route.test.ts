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
vi.mock('@/lib/cli-auth', () => ({ validateAccessToken: vi.fn() }));
vi.mock('@/lib/mcp/deps', () => ({ realMcpDeps: vi.fn(() => ({})) }));

import { validateAccessToken } from '@/lib/cli-auth';
import { accountResource, anonResource } from '@/lib/oauth/config';
import { s256 } from '@/lib/oauth/params';
import {
  createAuthorizationCode,
  exchangeAuthorizationCode,
  revokeGrant,
} from '@/lib/oauth/tokens';
import { GET as anonGET, POST as anonPOST } from '../route';
import { GET, POST } from './route';

const validatePat = validateAccessToken as ReturnType<typeof vi.fn>;
const ISSUER = 'http://test.localhost';
const VERIFIER = 'w'.repeat(50);

const listTools = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
function rpc(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(listTools),
  });
}
const account = (h?: Record<string, string>) =>
  rpc(`${ISSUER}/api/mcp/account`, h);
const anon = (h?: Record<string, string>) => rpc(`${ISSUER}/api/mcp`, h);
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const toolNames = async (res: Response) =>
  ((await res.json()).result.tools as { name: string }[])
    .map((t) => t.name)
    .sort();

/** Issue OAuth tokens for `resource` through the real code exchange. */
async function oauthTokens(resource: string, scope = 'sites:write') {
  const client = await db.oAuthClient.create({
    data: {
      clientId: `dcr_${resource.length}_${Math.random()}`,
      kind: 'DCR',
      name: 'Claude',
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
    },
  });
  const grant = await db.oAuthGrant.create({
    data: {
      userId: 'user-1',
      clientId: client!.id,
      scope,
      resource,
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
    },
  });
  const code = await createAuthorizationCode({
    grantId: grant!.id,
    codeChallenge: s256(VERIFIER),
    redirectUri: 'https://claude.ai/api/mcp/auth_callback',
  });
  const r = await exchangeAuthorizationCode({
    code,
    clientId: client!.clientId,
    redirectUri: 'https://claude.ai/api/mcp/auth_callback',
    codeVerifier: VERIFIER,
  });
  if (!r.ok) throw new Error(r.error_description);
  return { ...r.tokens, grantId: grant!.id as string };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  enabled.value = true;
  validatePat.mockResolvedValue(null);
});

describe('/api/mcp/account', () => {
  it('answers 401 with a resource_metadata challenge when unauthenticated', async () => {
    const res = await POST(account());
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${ISSUER}/.well-known/oauth-protected-resource/api/mcp/account", scope="sites:write"`,
    );
    expect((await res.json()).error.code).toBe(-32001);
  });

  it('challenges an unauthenticated GET too', async () => {
    const res = await GET(
      new NextRequest(`${ISSUER}/api/mcp/account`, { method: 'GET' }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(/resource_metadata=/);
  });

  it('serves the signed-in tools for a valid OAuth token issued for it', async () => {
    const t = await oauthTokens(accountResource());
    const res = await POST(account(bearer(t.access_token)));
    expect(res.status).toBe(200);
    expect(await toolNames(res)).toEqual([
      'claim-site',
      'list-sites',
      'publish',
    ]);
  });

  it('rejects a token issued for /api/mcp (wrong audience)', async () => {
    const t = await oauthTokens(anonResource());
    const res = await POST(account(bearer(t.access_token)));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(
      /error="invalid_token"/,
    );
  });

  it('rejects a revoked token', async () => {
    const t = await oauthTokens(accountResource());
    await revokeGrant(t.grantId);
    const res = await POST(account(bearer(t.access_token)));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(
      /error="invalid_token"/,
    );
  });

  it('rejects an expired token', async () => {
    const t = await oauthTokens(accountResource());
    for (const row of db.tables.oAuthToken.values()) {
      row.expiresAt = new Date(Date.now() - 1000);
    }
    expect((await POST(account(bearer(t.access_token)))).status).toBe(401);
  });

  it('rejects a refresh token used as a bearer', async () => {
    const t = await oauthTokens(accountResource());
    const res = await POST(account(bearer(t.refresh_token)));
    expect(res.status).toBe(401);
  });

  it('answers 403 insufficient_scope for a token without sites:write', async () => {
    const t = await oauthTokens(accountResource(), 'other:scope');
    const res = await POST(account(bearer(t.access_token)));
    expect(res.status).toBe(403);
    expect(res.headers.get('www-authenticate')).toMatch(
      /error="insufficient_scope"/,
    );
  });

  it('also accepts a personal access token', async () => {
    validatePat.mockResolvedValue({ userId: 'u1' });
    const res = await POST(account(bearer('fs_pat_ok')));
    expect(res.status).toBe(200);
    expect(await toolNames(res)).toContain('claim-site');
  });

  it('rejects an unknown token with the OAuth challenge', async () => {
    const res = await POST(account(bearer('garbage')));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(/resource_metadata=/);
  });

  it('404s while MCP OAuth is switched off', async () => {
    enabled.value = false;
    expect((await POST(account())).status).toBe(404);
  });
});

describe('/api/mcp with OAuth tokens', () => {
  it('stays anonymous without Authorization (unchanged)', async () => {
    const res = await anonPOST(anon());
    expect(res.status).toBe(200);
    expect(await toolNames(res)).toEqual(['publish']);
  });

  it('rejects an /api/mcp/account token (wrong audience)', async () => {
    const t = await oauthTokens(accountResource());
    const res = await anonPOST(anon(bearer(t.access_token)));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe(
      `Bearer error="invalid_token", resource_metadata="${ISSUER}/.well-known/oauth-protected-resource/api/mcp", scope="sites:write"`,
    );
  });

  it('accepts a token issued for /api/mcp', async () => {
    const t = await oauthTokens(anonResource());
    const res = await anonPOST(anon(bearer(t.access_token)));
    expect(res.status).toBe(200);
    expect(await toolNames(res)).toEqual([
      'claim-site',
      'list-sites',
      'publish',
    ]);
  });

  it('keeps the original challenge for a bad PAT', async () => {
    const res = await anonPOST(anon(bearer('fs_pat_revoked')));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe(
      'Bearer realm="flowershow"',
    );
  });

  it('GET is still 405 without auth', async () => {
    const res = await anonGET(
      new NextRequest(`${ISSUER}/api/mcp`, { method: 'GET' }),
    );
    expect(res.status).toBe(405);
  });
});
