import type { NextRequest } from 'next/server';
import { registerDcrClient } from '@/lib/oauth/clients';
import {
  disabledResponse,
  oauthError,
  oauthJson,
  preflight,
} from '@/lib/oauth/http';
import { scheduleOAuthCleanup } from '@/lib/oauth/cleanup';
import { checkOAuthRateLimit } from '@/lib/oauth/rate-limit';

/**
 * POST /oauth/register: RFC 7591 dynamic client registration, public clients
 * only (token_endpoint_auth_method "none"). Open (no initial access token),
 * rate limited per IP. Clients that support client ID metadata documents
 * don't need this.
 */
export async function POST(request: NextRequest) {
  const disabled = disabledResponse();
  if (disabled) return disabled;
  if (!(await checkOAuthRateLimit('register', request.headers))) {
    return oauthError(
      'invalid_request',
      'Too many registrations. Try again later.',
      429,
      {
        'Retry-After': '3600',
      },
    );
  }
  scheduleOAuthCleanup();
  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(type)) {
    return oauthError(
      'invalid_client_metadata',
      'Content-Type must be application/json',
    );
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 16 * 1024) {
      return oauthError(
        'invalid_client_metadata',
        'Registration request too large',
      );
    }
    body = JSON.parse(text);
  } catch {
    return oauthError('invalid_client_metadata', 'Body must be JSON');
  }

  const result = await registerDcrClient(body);
  if (!result.ok) return oauthError(result.error, result.description);
  const { client } = result;
  return oauthJson(
    {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.name,
      ...(client.uri && { client_uri: client.uri }),
      ...(client.logoUri && { logo_uri: client.logoUri }),
      redirect_uris: client.redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    201,
  );
}

export { preflight as OPTIONS };
