import { NextResponse, type NextRequest } from 'next/server';
import {
  CORS_HEADERS,
  disabledResponse,
  oauthError,
  preflight,
  readParams,
} from '@/lib/oauth/http';
import { checkOAuthRateLimit } from '@/lib/oauth/rate-limit';
import { revokeToken } from '@/lib/oauth/tokens';

/**
 * POST /oauth/revoke (RFC 7009). Revoking either token revokes the whole
 * grant. Answers 200 for unknown tokens, as the RFC requires.
 */
export async function POST(request: NextRequest) {
  const disabled = disabledResponse();
  if (disabled) return disabled;
  if (!(await checkOAuthRateLimit('revoke', request.headers))) {
    return oauthError(
      'invalid_request',
      'Too many requests. Try again shortly.',
      429,
      {
        'Retry-After': '60',
      },
    );
  }
  const params = await readParams(request);
  if (!params || typeof params.token !== 'string' || !params.token) {
    return oauthError('invalid_request', 'token is required');
  }
  await revokeToken(params.token, params.client_id);
  return new NextResponse(null, {
    status: 200,
    headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' },
  });
}

export { preflight as OPTIONS };
