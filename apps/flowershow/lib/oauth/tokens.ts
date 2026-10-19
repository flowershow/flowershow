import { createHash, randomBytes } from 'node:crypto';
import prisma from '@/server/db';
import {
  ACCESS_TOKEN_PREFIX,
  ACCESS_TOKEN_TTL_S,
  AUTH_CODE_TTL_S,
  REFRESH_TOKEN_PREFIX,
  REFRESH_TOKEN_TTL_S,
} from './config';
import { scopeWithin, verifyPkce } from './params';

/**
 * Authorization codes, access and refresh tokens. All are 256-bit random
 * values; only their SHA-256 hashes are stored. Single use is enforced with
 * conditional updates (`usedAt: null`), so two concurrent redemptions can't
 * both succeed.
 */

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function random(prefix = ''): string {
  return `${prefix}${randomBytes(32).toString('base64url')}`;
}

export type TokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
};

/** OAuth error codes the token endpoint returns (RFC 6749 §5.2, RFC 8707). */
export type TokenError = {
  error:
    | 'invalid_grant'
    | 'invalid_scope'
    | 'invalid_target'
    | 'invalid_request';
  error_description: string;
};

export type TokenResult =
  | {
      ok: true;
      tokens: TokenResponse;
      grant: { id: string; userId: string };
    }
  | ({ ok: false } & TokenError);

const invalidGrant = (error_description: string): TokenResult => ({
  ok: false,
  error: 'invalid_grant',
  error_description,
});

/** Issue a 60-second single-use code for a grant. Returns the plaintext code. */
export async function createAuthorizationCode(
  input: { grantId: string; codeChallenge: string; redirectUri: string },
  now = new Date(),
): Promise<string> {
  const code = random();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: hashSecret(code),
      grantId: input.grantId,
      codeChallenge: input.codeChallenge,
      redirectUri: input.redirectUri,
      expiresAt: new Date(now.getTime() + AUTH_CODE_TTL_S * 1000),
    },
  });
  return code;
}

/** Revoke a grant: mark it revoked and delete its tokens and codes. */
export async function revokeGrant(grantId: string, now = new Date()) {
  await prisma.$transaction([
    prisma.oAuthGrant.updateMany({
      where: { id: grantId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.oAuthToken.deleteMany({ where: { grantId } }),
    prisma.oAuthAuthorizationCode.deleteMany({ where: { grantId } }),
  ]);
}

/**
 * Issue an access + refresh token pair. A token row stores a scope only when
 * it is narrower than the grant's (after a refresh that asked for less);
 * null means the grant's scope.
 */
async function issueTokens(
  grant: { id: string; scope: string },
  now: Date,
  scopes: { access?: string; refresh?: string } = {},
): Promise<TokenResponse> {
  const access = random(ACCESS_TOKEN_PREFIX);
  const refresh = random(REFRESH_TOKEN_PREFIX);
  const accessScope = scopes.access ?? grant.scope;
  const refreshScope = scopes.refresh ?? grant.scope;
  const stored = (scope: string) => (scope === grant.scope ? null : scope);
  await prisma.$transaction([
    prisma.oAuthToken.create({
      data: {
        tokenHash: hashSecret(access),
        grantId: grant.id,
        kind: 'ACCESS',
        scope: stored(accessScope),
        expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_S * 1000),
      },
    }),
    prisma.oAuthToken.create({
      data: {
        tokenHash: hashSecret(refresh),
        grantId: grant.id,
        kind: 'REFRESH',
        scope: stored(refreshScope),
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_S * 1000),
      },
    }),
    prisma.oAuthGrant.update({
      where: { id: grant.id },
      data: { lastUsedAt: now },
    }),
  ]);
  return {
    access_token: access,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_S,
    refresh_token: refresh,
    scope: accessScope,
  };
}

const normalizeScope = (scope: string) =>
  [...new Set(scope.split(' ').filter(Boolean))].join(' ');

const GRANT_SELECT = {
  id: true,
  userId: true,
  scope: true,
  resource: true,
  revokedAt: true,
  client: { select: { clientId: true } },
} as const;

export type CodeExchangeInput = {
  code: unknown;
  clientId: unknown;
  redirectUri: unknown;
  codeVerifier: unknown;
  resource?: unknown;
};

/**
 * authorization_code grant. The code is marked used before any other check,
 * so a failed attempt burns it; a second redemption of a used code revokes
 * the grant (RFC 6749 §4.1.2).
 */
export async function exchangeAuthorizationCode(
  input: CodeExchangeInput,
  now = new Date(),
): Promise<TokenResult> {
  const { code, clientId, redirectUri, codeVerifier, resource } = input;
  if (typeof code !== 'string' || !code || code.length > 256) {
    return {
      ok: false,
      error: 'invalid_request',
      error_description: 'code is required',
    };
  }
  if (typeof clientId !== 'string' || !clientId) {
    return {
      ok: false,
      error: 'invalid_request',
      error_description: 'client_id is required',
    };
  }
  if (typeof redirectUri !== 'string' || !redirectUri) {
    return {
      ok: false,
      error: 'invalid_request',
      error_description: 'redirect_uri is required',
    };
  }
  if (typeof codeVerifier !== 'string' || !codeVerifier) {
    return {
      ok: false,
      error: 'invalid_request',
      error_description: 'code_verifier is required',
    };
  }

  const codeHash = hashSecret(code);
  const claimed = await prisma.oAuthAuthorizationCode.updateMany({
    where: { codeHash, usedAt: null },
    data: { usedAt: now },
  });
  const row = await prisma.oAuthAuthorizationCode.findUnique({
    where: { codeHash },
    select: {
      grantId: true,
      codeChallenge: true,
      redirectUri: true,
      expiresAt: true,
      grant: { select: GRANT_SELECT },
    },
  });
  if (!row) return invalidGrant('Invalid authorization code');
  if (claimed.count === 0) {
    await revokeGrant(row.grantId, now);
    return invalidGrant('Authorization code already used');
  }
  if (row.expiresAt.getTime() <= now.getTime()) {
    return invalidGrant('Authorization code expired');
  }
  const { grant } = row;
  if (grant.revokedAt) return invalidGrant('Authorization was revoked');
  if (grant.client.clientId !== clientId) {
    return invalidGrant('Authorization code was issued to another client');
  }
  if (row.redirectUri !== redirectUri) {
    return invalidGrant(
      'redirect_uri does not match the authorization request',
    );
  }
  if (!verifyPkce(codeVerifier, row.codeChallenge)) {
    return invalidGrant('PKCE verification failed');
  }
  if (
    resource !== undefined &&
    resource !== '' &&
    resource !== grant.resource
  ) {
    return {
      ok: false,
      error: 'invalid_target',
      error_description: 'resource does not match the authorization request',
    };
  }
  return {
    ok: true,
    tokens: await issueTokens(grant, now),
    grant: { id: grant.id, userId: grant.userId },
  };
}

export type RefreshInput = {
  refreshToken: unknown;
  clientId: unknown;
  scope?: unknown;
  resource?: unknown;
};

/**
 * refresh_token grant with rotation: each refresh token works once. Presenting
 * one that was already used means it leaked (or the client raced itself), so
 * the whole grant is revoked (OAuth 2.0 Security BCP §4.14.2). A `scope`
 * narrower than the refresh token's is honoured for the new access token; the
 * new refresh token keeps the old one's scope (RFC 6749 §6).
 */
export async function refreshTokens(
  input: RefreshInput,
  now = new Date(),
): Promise<TokenResult> {
  const { refreshToken, clientId, scope, resource } = input;
  if (
    typeof refreshToken !== 'string' ||
    !refreshToken.startsWith(REFRESH_TOKEN_PREFIX)
  ) {
    return invalidGrant('Invalid refresh token');
  }
  if (typeof clientId !== 'string' || !clientId) {
    return {
      ok: false,
      error: 'invalid_request',
      error_description: 'client_id is required',
    };
  }
  const tokenHash = hashSecret(refreshToken);
  const row = await prisma.oAuthToken.findUnique({
    where: { tokenHash },
    select: {
      kind: true,
      expiresAt: true,
      usedAt: true,
      scope: true,
      grantId: true,
      grant: { select: GRANT_SELECT },
    },
  });
  if (!row || row.kind !== 'REFRESH')
    return invalidGrant('Invalid refresh token');
  if (row.grant.client.clientId !== clientId) {
    return invalidGrant('Refresh token was issued to another client');
  }
  if (row.usedAt) {
    await revokeGrant(row.grantId, now);
    return invalidGrant('Refresh token already used; authorization revoked');
  }
  if (row.expiresAt.getTime() <= now.getTime())
    return invalidGrant('Refresh token expired');
  if (row.grant.revokedAt) return invalidGrant('Authorization was revoked');
  const refreshScope = row.scope ?? row.grant.scope;
  let accessScope = refreshScope;
  if (scope !== undefined && scope !== '') {
    if (
      typeof scope !== 'string' ||
      !normalizeScope(scope) ||
      !scopeWithin(scope, refreshScope)
    ) {
      return {
        ok: false,
        error: 'invalid_scope',
        error_description: 'scope exceeds the original grant',
      };
    }
    accessScope = normalizeScope(scope);
  }
  if (
    resource !== undefined &&
    resource !== '' &&
    resource !== row.grant.resource
  ) {
    return {
      ok: false,
      error: 'invalid_target',
      error_description: 'resource does not match the original grant',
    };
  }

  const claimed = await prisma.oAuthToken.updateMany({
    where: { tokenHash, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count === 0) {
    // Lost a race with another use of the same token: treat as reuse.
    await revokeGrant(row.grantId, now);
    return invalidGrant('Refresh token already used; authorization revoked');
  }
  return {
    ok: true,
    tokens: await issueTokens(row.grant, now, {
      access: accessScope,
      refresh: refreshScope,
    }),
    grant: { id: row.grant.id, userId: row.grant.userId },
  };
}

/**
 * RFC 7009 revocation: revokes the token's whole grant. Unknown tokens, and
 * tokens of another client when client_id is given, are ignored (the caller
 * always answers 200).
 */
export async function revokeToken(
  token: unknown,
  clientId: unknown,
  now = new Date(),
): Promise<void> {
  if (
    typeof token !== 'string' ||
    !(
      token.startsWith(ACCESS_TOKEN_PREFIX) ||
      token.startsWith(REFRESH_TOKEN_PREFIX)
    )
  ) {
    return;
  }
  const row = await prisma.oAuthToken.findUnique({
    where: { tokenHash: hashSecret(token) },
    select: {
      grantId: true,
      grant: { select: { client: { select: { clientId: true } } } },
    },
  });
  if (!row) return;
  if (
    typeof clientId === 'string' &&
    clientId &&
    row.grant.client.clientId !== clientId
  ) {
    return;
  }
  await revokeGrant(row.grantId, now);
}

export type AccessTokenInfo = {
  userId: string;
  grantId: string;
  scopes: string[];
  resource: string;
};

/**
 * Validate an OAuth access token for one resource (audience). Returns null
 * for unknown, expired, revoked or other-audience tokens.
 */
export async function validateOAuthAccessToken(
  token: string,
  expectedResource: string,
  now = new Date(),
): Promise<AccessTokenInfo | null> {
  if (!token.startsWith(ACCESS_TOKEN_PREFIX) || token.length > 256) return null;
  const row = await prisma.oAuthToken.findUnique({
    where: { tokenHash: hashSecret(token) },
    select: {
      kind: true,
      expiresAt: true,
      scope: true,
      grant: {
        select: {
          id: true,
          userId: true,
          scope: true,
          resource: true,
          revokedAt: true,
        },
      },
    },
  });
  if (!row || row.kind !== 'ACCESS') return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;
  const { grant } = row;
  if (grant.revokedAt) return null;
  if (grant.resource !== expectedResource) return null;

  prisma.oAuthGrant
    .update({ where: { id: grant.id }, data: { lastUsedAt: now } })
    .catch(() => {});
  return {
    userId: grant.userId,
    grantId: grant.id,
    scopes: (row.scope ?? grant.scope).split(' ').filter(Boolean),
    resource: grant.resource,
  };
}
