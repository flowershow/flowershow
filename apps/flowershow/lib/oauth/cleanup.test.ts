import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb as db } from './fake-db';

vi.mock('@/server/db', async () => ({
  default: (await import('./fake-db')).fakeDb,
}));

import {
  CODE_GRACE_MS,
  scheduleOAuthCleanup,
  sweepExpiredOAuthRows,
  UNUSED_CLIENT_MS,
} from './cleanup';

const NOW = new Date('2026-10-18T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const ahead = (ms: number) => new Date(NOW.getTime() + ms);
const MIN = 60 * 1000;

async function client(id: string, createdAt: Date) {
  await db.oAuthClient.create({
    data: {
      id,
      clientId: `dcr_${id}`,
      kind: 'DCR',
      name: id,
      redirectUris: ['https://claude.ai/cb'],
      createdAt,
    },
  });
}

async function grant(id: string, clientId: string) {
  await db.oAuthGrant.create({
    data: {
      id,
      userId: 'user-1',
      clientId,
      scope: 'sites:write',
      resource: 'r',
      redirectUri: 'https://claude.ai/cb',
    },
  });
}

beforeEach(() => db.reset());

describe('sweepExpiredOAuthRows', () => {
  it('deletes expired pending requests, codes and tokens, and keeps live ones', async () => {
    await client('c1', ago(30 * 24 * 60 * MIN));
    await grant('g1', 'c1');
    for (const [id, expiresAt] of [
      ['p-old', ago(1)],
      ['p-live', ahead(MIN)],
    ] as const) {
      await db.oAuthPendingRequest.create({
        data: { id, clientId: 'c1', params: {}, expiresAt },
      });
    }
    for (const [codeHash, expiresAt] of [
      ['code-old', ago(CODE_GRACE_MS + 1)],
      // Just expired: kept a while so a replay still revokes the grant.
      ['code-recent', ago(MIN)],
      ['code-live', ahead(MIN)],
    ] as const) {
      await db.oAuthAuthorizationCode.create({
        data: {
          codeHash,
          grantId: 'g1',
          codeChallenge: 'x',
          redirectUri: 'https://claude.ai/cb',
          expiresAt,
        },
      });
    }
    for (const [tokenHash, expiresAt, usedAt] of [
      ['t-old', ago(1), null],
      ['t-live', ahead(MIN), null],
      // A used (rotated) refresh token stays until it expires: presenting it
      // again must still revoke the grant.
      ['t-used-live', ahead(MIN), ago(MIN)],
    ] as const) {
      await db.oAuthToken.create({
        data: {
          tokenHash,
          grantId: 'g1',
          kind: 'REFRESH',
          expiresAt,
          usedAt,
        },
      });
    }

    expect(await sweepExpiredOAuthRows(NOW)).toEqual({
      pendingRequests: 1,
      codes: 1,
      tokens: 1,
      clients: 0,
    });
    expect([...db.tables.oAuthPendingRequest.keys()]).toEqual(['p-live']);
    expect([...db.tables.oAuthAuthorizationCode.keys()]).toEqual([
      'code-recent',
      'code-live',
    ]);
    expect([...db.tables.oAuthToken.keys()]).toEqual(['t-live', 't-used-live']);
  });

  it('deletes clients never authorized within 7 days, keeping recent or used ones', async () => {
    await client('unused-old', ago(UNUSED_CLIENT_MS + 1));
    await client('unused-new', ago(UNUSED_CLIENT_MS - MIN));
    await client('used-old', ago(UNUSED_CLIENT_MS + 1));
    await grant('g', 'used-old');
    // A revoked grant still counts as use: the dashboard history keeps it.
    await client('revoked-old', ago(UNUSED_CLIENT_MS + 1));
    await grant('g2', 'revoked-old');
    db.tables.oAuthGrant.get('g2')!.revokedAt = ago(MIN);

    expect((await sweepExpiredOAuthRows(NOW)).clients).toBe(1);
    expect([...db.tables.oAuthClient.keys()].sort()).toEqual([
      'revoked-old',
      'unused-new',
      'used-old',
    ]);
  });

  it('is bounded: at most `limit` rows per table per call', async () => {
    await client('c1', NOW);
    for (let i = 0; i < 7; i++) {
      await db.oAuthPendingRequest.create({
        data: { id: `p${i}`, clientId: 'c1', params: {}, expiresAt: ago(1) },
      });
    }
    expect((await sweepExpiredOAuthRows(NOW, 5)).pendingRequests).toBe(5);
    expect(db.tables.oAuthPendingRequest.size).toBe(2);
    expect((await sweepExpiredOAuthRows(NOW, 5)).pendingRequests).toBe(2);
    expect((await sweepExpiredOAuthRows(NOW, 5)).pendingRequests).toBe(0);
  });
});

describe('scheduleOAuthCleanup', () => {
  it('is a no-op outside a request scope', () => {
    expect(() => scheduleOAuthCleanup()).not.toThrow();
  });
});
