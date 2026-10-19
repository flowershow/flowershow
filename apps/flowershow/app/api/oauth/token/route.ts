import type { NextRequest } from 'next/server';
import {
  disabledResponse,
  oauthError,
  oauthJson,
  preflight,
  readParams,
} from '@/lib/oauth/http';
import { scheduleOAuthCleanup } from '@/lib/oauth/cleanup';
import { captureOAuthEvent } from '@/lib/oauth/events';
import { checkOAuthRateLimit } from '@/lib/oauth/rate-limit';
import { exchangeAuthorizationCode, refreshTokens } from '@/lib/oauth/tokens';

/**
 * POST /oauth/token (RFC 6749 §3.2): authorization_code (with PKCE) and
 * refresh_token (rotating) grants for public clients. Accepts form-encoded
 * (what Claude sends) and JSON bodies.
 */
export async function POST(request: NextRequest) {
  const disabled = disabledResponse();
  if (disabled) return disabled;
  if (!(await checkOAuthRateLimit('token', request.headers))) {
    // slow_down is a device-flow error (RFC 8628); the token endpoint has no
    // rate-limit code, so: 429 + invalid_request + Retry-After.
    return oauthError(
      'invalid_request',
      'Too many requests. Try again shortly.',
      429,
      { 'Retry-After': '60' },
    );
  }
  scheduleOAuthCleanup();
  // Public clients only: refuse client authentication we can't verify.
  // RFC 6749 §5.2: a 401 invalid_client carries WWW-Authenticate, with the
  // scheme the client tried.
  const authorization = request.headers.get('authorization');
  if (authorization) {
    const scheme = /^[A-Za-z][\w!#$%&'*+.^`|~-]*/.exec(authorization)?.[0];
    return oauthError(
      'invalid_client',
      'Client authentication is not supported; send client_id in the body',
      401,
      { 'WWW-Authenticate': wwwAuthenticate(scheme ?? 'Basic') },
    );
  }
  const params = await readParams(request);
  if (!params) {
    return oauthError(
      'invalid_request',
      'Body must be form-encoded or JSON, without repeated parameters',
    );
  }
  if (params.client_secret !== undefined) {
    return oauthError(
      'invalid_client',
      'Client secrets are not supported',
      401,
      { 'WWW-Authenticate': wwwAuthenticate('Basic') },
    );
  }

  const result =
    params.grant_type === 'authorization_code'
      ? await exchangeAuthorizationCode({
          code: params.code,
          clientId: params.client_id,
          redirectUri: params.redirect_uri,
          codeVerifier: params.code_verifier,
          resource: params.resource,
        })
      : params.grant_type === 'refresh_token'
        ? await refreshTokens({
            refreshToken: params.refresh_token,
            clientId: params.client_id,
            scope: params.scope,
            resource: params.resource,
          })
        : null;

  if (!result) {
    return oauthError(
      'unsupported_grant_type',
      'Use authorization_code or refresh_token',
    );
  }
  if (!result.ok) return oauthError(result.error, result.error_description);
  if (params.grant_type === 'refresh_token') {
    captureOAuthEvent(result.grant.userId, 'mcp_oauth_grant_refreshed', {
      grant_id: result.grant.id,
    });
  }
  return oauthJson(result.tokens);
}

function wwwAuthenticate(scheme: string): string {
  return `${scheme} realm="flowershow", error="invalid_client"`;
}

export { preflight as OPTIONS };
