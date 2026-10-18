import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb as db } from './fake-db';

vi.mock('@/server/db', async () => ({
  default: (await import('./fake-db')).fakeDb,
}));

import { accountResource } from './config';
import { listConnectedApps, revokeUserGrant } from './grants';
import {
  createAuthorizationCode,
  hashSecret,
  validateOAuthAccessToken,
} from './tokens';

const T0 = new Date('2026-10-18T10:00:00Z');

beforeEach(async () => {
  db.reset();
  await db.oAuthClient.create({
    data: {
      id: 'c-dcr',
      clientId: 'dcr_x',
      kind: 'DCR',
      name: 'MCP Inspector',
      redirectUris: ['http://localhost:6274/oauth/callback'],
    },
  });
  await db.oAuthClient.create({
    data: {
      id: 'c-cimd',
      clientId: 'https://claude.ai/oauth/mcp-client.json',
      kind: 'CIMD',
      name: 'Claude',
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
    },
  });
  for (const [id, userId, clientId, redirectUri] of [
    ['g-claude', 'user-1', 'c-cimd', 'https://claude.ai/api/mcp/auth_callback'],
    ['g-inspector', 'user-1', 'c-dcr', 'http://localhost:6274/oauth/callback'],
    [
      'g-other-user',
      'user-2',
      'c-cimd',
      'https://claude.ai/api/mcp/auth_callback',
    ],
  ] as const) {
    await db.oAuthGrant.create({
      data: {
        id,
        userId,
        clientId,
        scope: 'sites:write',
        resource: accountResource(),
        redirectUri,
        createdAt: T0,
      },
    });
  }
});

describe('listConnectedApps', () => {
  it("lists the user's active grants with the app's host", async () => {
    const apps = await listConnectedApps('user-1');
    expect(apps).toHaveLength(2);
    expect(apps.find((a) => a.id === 'g-claude')).toMatchObject({
      name: 'Claude',
      host: 'claude.ai', // CIMD: the client_id host
      userHosted: false,
      scope: 'sites:write',
      createdAt: T0,
      lastUsedAt: null,
    });
    expect(apps.find((a) => a.id === 'g-inspector')).toMatchObject({
      name: 'MCP Inspector',
      host: 'localhost (an app on this computer)', // DCR: the redirect host
    });
  });

  it('leaves out revoked grants', async () => {
    db.tables.oAuthGrant.get('g-inspector')!.revokedAt = T0;
    expect((await listConnectedApps('user-1')).map((a) => a.id)).toEqual([
      'g-claude',
    ]);
  });
});

describe('revokeUserGrant', () => {
  it('revokes the grant and deletes its tokens and codes: the next MCP call is refused', async () => {
    const access = `fs_oat_${'a'.repeat(43)}`;
    await db.oAuthToken.create({
      data: {
        tokenHash: hashSecret(access),
        grantId: 'g-claude',
        kind: 'ACCESS',
        expiresAt: new Date(T0.getTime() + 3600_000),
      },
    });
    await createAuthorizationCode(
      { grantId: 'g-claude', codeChallenge: 'x', redirectUri: 'r' },
      T0,
    );
    expect(
      await validateOAuthAccessToken(access, accountResource(), T0),
    ).toMatchObject({ userId: 'user-1' });
    expect(await revokeUserGrant('user-1', 'g-claude', T0)).toBe(true);
    expect(db.tables.oAuthGrant.get('g-claude')!.revokedAt).toEqual(T0);
    expect(
      [...db.tables.oAuthToken.values()].filter(
        (t) => t.grantId === 'g-claude',
      ),
    ).toHaveLength(0);
    expect(db.tables.oAuthAuthorizationCode.size).toBe(0);
    expect(
      await validateOAuthAccessToken(access, accountResource(), T0),
    ).toBeNull();
    // Other grants are untouched.
    expect(db.tables.oAuthGrant.get('g-inspector')!.revokedAt).toBeNull();
  });

  it("refuses another user's grant, and an already revoked one", async () => {
    expect(await revokeUserGrant('user-1', 'g-other-user', T0)).toBe(false);
    expect(db.tables.oAuthGrant.get('g-other-user')!.revokedAt).toBeNull();
    expect(await revokeUserGrant('user-1', 'g-claude', T0)).toBe(true);
    expect(await revokeUserGrant('user-1', 'g-claude', T0)).toBe(false);
    expect(await revokeUserGrant('user-1', 'nope', T0)).toBe(false);
  });
});
