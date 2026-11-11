import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
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
// Only list-sites is exercised; the gate tests check deps are never built.
const deps = vi.hoisted(() => ({ listSites: async () => [] }));
vi.mock('@/lib/mcp/deps', () => ({ realMcpDeps: vi.fn(() => deps) }));

import { validateAccessToken } from '@/lib/cli-auth';
import { realMcpDeps } from '@/lib/mcp/deps';
import { mcpResource, oauthIssuer } from '@/lib/oauth/config';
import { s256 } from '@/lib/oauth/params';
import {
  createAuthorizationCode,
  exchangeAuthorizationCode,
  revokeGrant,
} from '@/lib/oauth/tokens';
import { POST as anonPOST } from './route';

const validatePat = validateAccessToken as ReturnType<typeof vi.fn>;
const ISSUER = 'http://test.localhost';
const VERIFIER = 'w'.repeat(50);

const toolsList = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
function post(url: string, body: unknown, headers: Record<string, string>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
// tools/list on /api/mcp.
const anon = (h: Record<string, string> = {}) =>
  post(`${ISSUER}/api/mcp`, toolsList, h);
/** tools/call on /api/mcp. */
const anonCall = (
  name: string,
  args: Record<string, unknown> = {},
  opts: {
    headers?: Record<string, string>;
    meta?: Record<string, unknown>;
  } = {},
) =>
  post(
    `${ISSUER}/api/mcp`,
    {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name, arguments: args, ...(opts.meta && { _meta: opts.meta }) },
    },
    opts.headers ?? {},
  );
const ANON_CHALLENGE = `Bearer error="invalid_token", error_description="Sign in to Flowershow to use this tool (a free account).", resource_metadata="${ISSUER}/.well-known/oauth-protected-resource/api/mcp", scope="sites:write"`;
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const toolList = z.object({
  result: z.object({
    tools: z.array(
      z.object({
        name: z.string(),
        _meta: z
          .object({ securitySchemes: z.array(z.object({ type: z.string() })) })
          .optional(),
      }),
    ),
  }),
});
const toolNames = async (res: Response) =>
  toolList
    .parse(await res.json())
    .result.tools.map((t) => t.name)
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

describe('/api/mcp with a token', () => {
  it('serves every tool for a valid OAuth token', async () => {
    const t = await oauthTokens(mcpResource());
    const res = await anonPOST(anon(bearer(t.access_token)));
    expect(res.status).toBe(200);
    expect(await toolNames(res)).toEqual([
      'claim-site',
      'list-files',
      'list-sites',
      'publish',
      'read-file',
    ]);
  });

  it('rejects a token issued for the removed /api/mcp/account URL', async () => {
    const t = await oauthTokens(`${oauthIssuer()}/api/mcp/account`);
    const res = await anonPOST(anon(bearer(t.access_token)));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(
      /error="invalid_token"/,
    );
  });

  it('rejects a revoked token', async () => {
    const t = await oauthTokens(mcpResource());
    await revokeGrant(t.grantId);
    const res = await anonPOST(anon(bearer(t.access_token)));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(
      /error="invalid_token"/,
    );
  });

  it('rejects an expired token', async () => {
    const t = await oauthTokens(mcpResource());
    for (const row of db.tables.oAuthToken.values()) {
      row.expiresAt = new Date(Date.now() - 1000);
    }
    expect((await anonPOST(anon(bearer(t.access_token)))).status).toBe(401);
  });

  it('rejects a refresh token used as a bearer', async () => {
    const t = await oauthTokens(mcpResource());
    const res = await anonPOST(anon(bearer(t.refresh_token)));
    expect(res.status).toBe(401);
  });

  it('answers 403 insufficient_scope for a token without sites:write', async () => {
    const t = await oauthTokens(mcpResource(), 'other:scope');
    const res = await anonPOST(anon(bearer(t.access_token)));
    expect(res.status).toBe(403);
    expect(res.headers.get('www-authenticate')).toMatch(
      /error="insufficient_scope"/,
    );
  });

  it('serves the account tools for a personal access token', async () => {
    validatePat.mockResolvedValue({ userId: 'u1' });
    const res = await anonPOST(anon(bearer('fs_pat_ok')));
    expect(res.status).toBe(200);
    expect(await toolNames(res)).toContain('claim-site');
  });
});

describe('/api/mcp', () => {
  it('lists every tool without Authorization (lazy sign-in)', async () => {
    const res = await anonPOST(anon());
    expect(res.status).toBe(200);
    expect(await toolNames(res)).toEqual([
      'claim-site',
      'list-files',
      'list-sites',
      'publish',
      'read-file',
    ]);
  });

  it('lists only publish without Authorization while OAuth is off', async () => {
    enabled.value = false;
    const res = await anonPOST(anon());
    expect(await toolNames(res)).toEqual(['publish']);
  });

  it('answers every tool that needs an account with 401 and a sign-in challenge', async () => {
    const { tools } = toolList.parse(
      await (await anonPOST(anon())).json(),
    ).result;
    const signedInOnly = tools
      .filter((t) => !t._meta?.securitySchemes.some((s) => s.type === 'noauth'))
      .map((t) => t.name)
      .sort();
    expect(signedInOnly).toEqual([
      'claim-site',
      'list-files',
      'list-sites',
      'read-file',
    ]);
    vi.mocked(realMcpDeps).mockClear();
    for (const name of signedInOnly) {
      const res = await anonPOST(anonCall(name, { siteId: 's1' }));
      expect(res.status, name).toBe(401);
      expect(res.headers.get('www-authenticate')).toBe(ANON_CHALLENGE);
    }
    expect(realMcpDeps).not.toHaveBeenCalled();
  });

  it('answers 401 when the call carries other client _meta (Claude Code)', async () => {
    const res = await anonPOST(
      anonCall(
        'list-sites',
        {},
        { meta: { 'claudecode/toolUseId': 'toolu_1', progressToken: 2 } },
      ),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe(ANON_CHALLENGE);
  });

  it('runs an anonymous publish without asking for sign-in', async () => {
    const res = await anonPOST(anonCall('publish', { files: [] }));
    expect(res.status).toBe(200);
    expect(res.headers.get('www-authenticate')).toBeNull();
  });

  it.each([
    { 'openai/subject': 'u-9' },
    { 'openai/session': 's-1', 'openai/locale': 'en-GB' },
  ])(
    'asks ChatGPT to sign in through the tool result instead of a 401 (%o)',
    async (meta) => {
      const res = await anonPOST(anonCall('list-sites', {}, { meta }));
      expect(res.status).toBe(200);
      const { result } = await res.json();
      expect(result.isError).toBe(true);
      expect(result._meta).toEqual({
        'mcp/www_authenticate': [ANON_CHALLENGE],
      });
    },
  );

  it('runs an account tool for a signed-in caller', async () => {
    const t = await oauthTokens(mcpResource());
    const res = await anonPOST(
      anonCall('list-sites', {}, { headers: bearer(t.access_token) }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).result.structuredContent).toEqual({ sites: [] });
  });

  it('answers an invalid OAuth token with the OAuth challenge', async () => {
    const res = await anonPOST(anon(bearer('fs_oat_unknown')));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe(
      `Bearer error="invalid_token", resource_metadata="${ISSUER}/.well-known/oauth-protected-resource/api/mcp", scope="sites:write"`,
    );
  });

  it('keeps the original challenge for a bad PAT', async () => {
    const res = await anonPOST(anon(bearer('fs_pat_revoked')));
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe(
      'Bearer realm="flowershow"',
    );
  });
});
