import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb as db } from './fake-db';

vi.mock('@/server/db', async () => ({
  default: (await import('./fake-db')).fakeDb,
}));

import { accountResource, anonResource } from './config';
import { s256 } from './params';
import {
  createAuthorizationCode,
  exchangeAuthorizationCode,
  hashSecret,
  refreshTokens,
  revokeGrant,
  revokeToken,
  validateOAuthAccessToken,
} from './tokens';

const VERIFIER = 'a'.repeat(20) + 'B'.repeat(20) + '-._~xyz';
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const T0 = new Date('2026-10-18T10:00:00Z');
const at = (s: number) => new Date(T0.getTime() + s * 1000);

async function setup(resource = accountResource()) {
  const client = await db.oAuthClient.create({
    data: {
      clientId: 'dcr_client1',
      kind: 'DCR',
      name: 'Claude',
      redirectUris: [REDIRECT],
    },
  });
  await db.oAuthClient.create({
    data: {
      clientId: 'dcr_other',
      kind: 'DCR',
      name: 'Other',
      redirectUris: [REDIRECT],
    },
  });
  const grant = await db.oAuthGrant.create({
    data: {
      userId: 'user-1',
      clientId: client!.id,
      scope: 'sites:write',
      resource,
      redirectUri: REDIRECT,
    },
  });
  const code = await createAuthorizationCode(
    {
      grantId: grant!.id,
      codeChallenge: s256(VERIFIER),
      redirectUri: REDIRECT,
    },
    T0,
  );
  return { grantId: grant!.id as string, code };
}

const exchange = (
  code: string,
  over: Record<string, unknown> = {},
  now = at(1),
) =>
  exchangeAuthorizationCode(
    {
      code,
      clientId: 'dcr_client1',
      redirectUri: REDIRECT,
      codeVerifier: VERIFIER,
      ...over,
    },
    now,
  );

async function tokensFor(now = at(1)) {
  const { grantId, code } = await setup();
  const r = await exchange(code, {}, now);
  if (!r.ok) throw new Error(r.error_description);
  return { grantId, ...r.tokens };
}

beforeEach(() => db.reset());

describe('authorization codes', () => {
  it('stores only a hash of the code', async () => {
    const { code } = await setup();
    expect(db.tables.oAuthAuthorizationCode.has(hashSecret(code))).toBe(true);
    expect([...db.tables.oAuthAuthorizationCode.keys()]).not.toContain(code);
    const row = db.tables.oAuthAuthorizationCode.get(hashSecret(code))!;
    expect(row.expiresAt.getTime() - T0.getTime()).toBe(60_000);
  });

  it('exchanges a valid code for opaque prefixed tokens', async () => {
    const { code } = await setup();
    const r = await exchange(code);
    expect(r).toMatchObject({
      ok: true,
      tokens: { token_type: 'Bearer', expires_in: 3600, scope: 'sites:write' },
    });
    if (!r.ok) return;
    expect(r.tokens.access_token).toMatch(/^fs_oat_[A-Za-z0-9_-]{43}$/);
    expect(r.tokens.refresh_token).toMatch(/^fs_ort_[A-Za-z0-9_-]{43}$/);
    // Only hashes at rest.
    expect(db.tables.oAuthToken.has(hashSecret(r.tokens.access_token))).toBe(
      true,
    );
    expect(db.tables.oAuthToken.has(r.tokens.access_token)).toBe(false);
  });

  it('is single use: a replay fails and revokes the grant and its tokens', async () => {
    const { code, grantId } = await setup();
    const first = await exchange(code);
    expect(first.ok).toBe(true);
    const replay = await exchange(code);
    expect(replay).toMatchObject({ ok: false, error: 'invalid_grant' });
    expect(db.tables.oAuthGrant.get(grantId)!.revokedAt).not.toBeNull();
    if (first.ok) {
      expect(
        await validateOAuthAccessToken(
          first.tokens.access_token,
          accountResource(),
          at(2),
        ),
      ).toBeNull();
    }
  });

  it('only one of two concurrent redemptions succeeds', async () => {
    const { code } = await setup();
    const results = await Promise.all([exchange(code), exchange(code)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it('expires after 60 seconds', async () => {
    const { code } = await setup();
    expect(await exchange(code, {}, at(61))).toMatchObject({
      ok: false,
      error: 'invalid_grant',
    });
  });

  it.each([
    ['wrong PKCE verifier', { codeVerifier: 'b'.repeat(43) }],
    ['the challenge as verifier (plain)', { codeVerifier: s256(VERIFIER) }],
    ['another client', { clientId: 'dcr_other' }],
    [
      'a different redirect_uri',
      { redirectUri: 'https://claude.ai/api/mcp/auth_callback/' },
    ],
    ['an unknown code', { code: 'nope' }],
  ])(
    'fails with invalid_grant for %s, and burns the code',
    async (_n, over) => {
      const { code } = await setup();
      const r = await exchange((over as { code?: string }).code ?? code, over);
      expect(r).toMatchObject({ ok: false, error: 'invalid_grant' });
      // The real code no longer works after a failed attempt with it.
      if (!('code' in over)) {
        expect((await exchange(code)).ok).toBe(false);
      }
    },
  );

  it('rejects a resource different from the grant (invalid_target)', async () => {
    const { code } = await setup();
    expect(await exchange(code, { resource: anonResource() })).toMatchObject({
      ok: false,
      error: 'invalid_target',
    });
  });

  it('accepts the grant resource or no resource', async () => {
    const a = await setup();
    expect((await exchange(a.code, { resource: accountResource() })).ok).toBe(
      true,
    );
  });

  it.each(['code', 'clientId', 'redirectUri', 'codeVerifier'])(
    'requires %s (invalid_request)',
    async (field) => {
      const { code } = await setup();
      expect(await exchange(code, { [field]: undefined })).toMatchObject({
        ok: false,
        error: 'invalid_request',
      });
    },
  );

  it('fails when the grant was revoked after the code was issued', async () => {
    const { code, grantId } = await setup();
    await db.oAuthGrant.update({
      where: { id: grantId },
      data: { revokedAt: T0 },
    });
    expect(await exchange(code)).toMatchObject({
      ok: false,
      error: 'invalid_grant',
    });
  });
});

describe('refresh token rotation', () => {
  const refresh = (
    token: string,
    over: Record<string, unknown> = {},
    now = at(10),
  ) =>
    refreshTokens(
      { refreshToken: token, clientId: 'dcr_client1', ...over },
      now,
    );

  it('issues a new pair and invalidates the old refresh token', async () => {
    const t = await tokensFor();
    const r = await refresh(t.refresh_token);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tokens.refresh_token).not.toBe(t.refresh_token);
    expect(r.tokens.access_token).not.toBe(t.access_token);
    expect(
      await validateOAuthAccessToken(
        r.tokens.access_token,
        accountResource(),
        at(11),
      ),
    ).toMatchObject({
      userId: 'user-1',
    });
    // The new refresh token works once too.
    expect((await refresh(r.tokens.refresh_token, {}, at(20))).ok).toBe(true);
  });

  it('detects reuse of a rotated refresh token and revokes the whole grant', async () => {
    const t = await tokensFor();
    const rotated = await refresh(t.refresh_token);
    if (!rotated.ok) throw new Error('setup');
    const reuse = await refresh(t.refresh_token, {}, at(20));
    expect(reuse).toMatchObject({ ok: false, error: 'invalid_grant' });
    expect(db.tables.oAuthGrant.get(t.grantId)!.revokedAt).not.toBeNull();
    // Everything issued from the grant is dead, including the legitimate rotation.
    expect(
      await validateOAuthAccessToken(
        rotated.tokens.access_token,
        accountResource(),
        at(21),
      ),
    ).toBeNull();
    expect((await refresh(rotated.tokens.refresh_token, {}, at(22))).ok).toBe(
      false,
    );
  });

  it('only one of two concurrent refreshes succeeds', async () => {
    const t = await tokensFor();
    const results = await Promise.all([
      refresh(t.refresh_token),
      refresh(t.refresh_token),
    ]);
    expect(results.filter((r) => r.ok).length).toBeLessThanOrEqual(1);
  });

  it('rejects an expired refresh token (30 days)', async () => {
    const t = await tokensFor();
    expect(
      await refresh(t.refresh_token, {}, at(30 * 24 * 3600 + 2)),
    ).toMatchObject({
      ok: false,
      error: 'invalid_grant',
    });
  });

  it('rejects a refresh token presented by another client without burning it', async () => {
    const t = await tokensFor();
    expect(
      await refresh(t.refresh_token, { clientId: 'dcr_other' }),
    ).toMatchObject({
      ok: false,
      error: 'invalid_grant',
    });
    expect((await refresh(t.refresh_token)).ok).toBe(true);
  });

  it('rejects an access token used as a refresh token', async () => {
    const t = await tokensFor();
    expect(await refresh(t.access_token)).toMatchObject({
      ok: false,
      error: 'invalid_grant',
    });
  });

  it('rejects a refresh after the grant was revoked', async () => {
    const t = await tokensFor();
    await revokeGrant(t.grantId, at(5));
    expect(await refresh(t.refresh_token)).toMatchObject({
      ok: false,
      error: 'invalid_grant',
    });
  });

  it('rejects scope escalation and a different resource', async () => {
    const t = await tokensFor();
    expect(
      await refresh(t.refresh_token, { scope: 'sites:write admin' }),
    ).toMatchObject({
      ok: false,
      error: 'invalid_scope',
    });
    expect(
      await refresh(t.refresh_token, { resource: anonResource() }),
    ).toMatchObject({
      ok: false,
      error: 'invalid_target',
    });
    expect(
      (
        await refresh(t.refresh_token, {
          scope: 'sites:write',
          resource: accountResource(),
        })
      ).ok,
    ).toBe(true);
  });

  it('requires client_id', async () => {
    const t = await tokensFor();
    expect(
      await refresh(t.refresh_token, { clientId: undefined }),
    ).toMatchObject({
      ok: false,
      error: 'invalid_request',
    });
  });
});

describe('access token validation', () => {
  it('accepts a live token for its own resource', async () => {
    const t = await tokensFor();
    expect(
      await validateOAuthAccessToken(t.access_token, accountResource(), at(2)),
    ).toEqual({
      userId: 'user-1',
      grantId: t.grantId,
      scopes: ['sites:write'],
      resource: accountResource(),
    });
  });

  it('rejects a token for another audience (resource)', async () => {
    const t = await tokensFor();
    expect(
      await validateOAuthAccessToken(t.access_token, anonResource(), at(2)),
    ).toBeNull();
    expect(
      await validateOAuthAccessToken(
        t.access_token,
        'https://flowershow.app/api/sites',
        at(2),
      ),
    ).toBeNull();
  });

  it('rejects an expired token (1 hour)', async () => {
    const t = await tokensFor();
    expect(
      await validateOAuthAccessToken(
        t.access_token,
        accountResource(),
        at(3602),
      ),
    ).toBeNull();
  });

  it('rejects a revoked token', async () => {
    const t = await tokensFor();
    await revokeGrant(t.grantId, at(2));
    expect(
      await validateOAuthAccessToken(t.access_token, accountResource(), at(3)),
    ).toBeNull();
  });

  it('rejects refresh tokens, PATs and garbage', async () => {
    const t = await tokensFor();
    for (const tok of [
      t.refresh_token,
      'fs_pat_abc',
      'fs_oat_unknown',
      '',
      `fs_oat_${'x'.repeat(300)}`,
    ]) {
      expect(
        await validateOAuthAccessToken(tok, accountResource(), at(2)),
      ).toBeNull();
    }
  });
});

describe('revocation (RFC 7009)', () => {
  it('revoking the refresh token revokes the grant and the access token', async () => {
    const t = await tokensFor();
    await revokeToken(t.refresh_token, 'dcr_client1', at(2));
    expect(db.tables.oAuthGrant.get(t.grantId)!.revokedAt).not.toBeNull();
    expect(
      await validateOAuthAccessToken(t.access_token, accountResource(), at(3)),
    ).toBeNull();
    expect(db.tables.oAuthToken.size).toBe(0);
  });

  it('revoking the access token works too', async () => {
    const t = await tokensFor();
    await revokeToken(t.access_token, undefined, at(2));
    expect(
      await validateOAuthAccessToken(t.access_token, accountResource(), at(3)),
    ).toBeNull();
  });

  it('ignores a token belonging to another client', async () => {
    const t = await tokensFor();
    await revokeToken(t.access_token, 'dcr_other', at(2));
    expect(
      await validateOAuthAccessToken(t.access_token, accountResource(), at(3)),
    ).not.toBeNull();
  });

  it('ignores unknown tokens', async () => {
    await expect(
      revokeToken('fs_oat_nope', undefined),
    ).resolves.toBeUndefined();
    await expect(revokeToken('fs_pat_x', undefined)).resolves.toBeUndefined();
  });
});
