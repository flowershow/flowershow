import { NextResponse } from 'next/server';
import {
  CORS_HEADERS,
  disabledResponse,
  preflight,
  protectedResourceMetadata,
  resourceForMetadataPath,
} from '@/lib/oauth/http';

/**
 * GET /.well-known/oauth-protected-resource[/api/mcp[/account]] (RFC 9728),
 * rewritten here by middleware. The bare path describes /api/mcp/account,
 * for clients that fall back to the origin root.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const disabled = disabledResponse();
  if (disabled) return disabled;
  const { path = [] } = await params;
  const resource = resourceForMetadataPath(
    path.length ? `/${path.join('/')}` : '',
  );
  if (!resource) {
    return new NextResponse('Not found', {
      status: 404,
      headers: CORS_HEADERS,
    });
  }
  return NextResponse.json(protectedResourceMetadata(resource), {
    headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' },
  });
}

export { preflight as OPTIONS };
