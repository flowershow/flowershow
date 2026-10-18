import { NextResponse } from 'next/server';
import {
  authorizationServerMetadata,
  CORS_HEADERS,
  disabledResponse,
  preflight,
} from '@/lib/oauth/http';

export const dynamic = 'force-dynamic';

/**
 * GET /.well-known/openid-configuration. Some MCP clients probe OIDC
 * discovery first; serve the same RFC 8414 metadata (no id_token support).
 */
export function GET() {
  const disabled = disabledResponse();
  if (disabled) return disabled;
  return NextResponse.json(authorizationServerMetadata(), {
    headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' },
  });
}

export { preflight as OPTIONS };
