import type { NextRequest } from 'next/server';
import {
  disabledResponse,
  oauthError,
  oauthJson,
  preflight,
  readParams,
} from '@/lib/oauth/http';
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
    return oauthError(
      'slow_down',
      'Too many requests. Try again shortly.',
      429,
      {
        'Retry-After': '60',
      },
    );
  }
  // Public clients only: refuse client authentication we can't verify.
  if (request.headers.get('authorization')) {
    return oauthError(
      'invalid_client',
      'Client authentication is not supported; send client_id in the body',
      401,
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
  return oauthJson(result.tokens);
}

export { preflight as OPTIONS };
