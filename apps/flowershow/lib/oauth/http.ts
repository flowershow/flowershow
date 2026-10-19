import { NextResponse } from 'next/server';
import {
  accountResource,
  anonResource,
  oauthEnabled,
  oauthIssuer,
  SUPPORTED_SCOPES,
} from './config';

/**
 * HTTP helpers for the OAuth endpoints. These endpoints use no cookies and
 * accept no ambient credentials, so CORS is open (browser-based MCP clients
 * such as MCP Inspector call them directly).
 */

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

export function oauthJson(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      ...extra,
    },
  });
}

export function oauthError(
  error: string,
  error_description: string,
  status = 400,
  extra: Record<string, string> = {},
): NextResponse {
  return oauthJson({ error, error_description }, status, extra);
}

export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** 404 while the authorization server is switched off (MCP_OAUTH_ENABLED). */
export function disabledResponse(): NextResponse | null {
  return oauthEnabled()
    ? null
    : new NextResponse('Not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
}

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Read an OAuth request body: application/x-www-form-urlencoded (RFC 6749)
 * or JSON. Returns null when the body is unreadable or too large.
 */
export async function readParams(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const text = await request.text().catch(() => null);
  if (text === null || Buffer.byteLength(text) > MAX_BODY_BYTES) return null;
  const type = request.headers.get('content-type') ?? '';
  if (/^application\/json\b/i.test(type)) {
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (/^application\/x-www-form-urlencoded\b/i.test(type) || type === '') {
    const params = new URLSearchParams(text);
    const out: Record<string, unknown> = {};
    for (const key of new Set(params.keys())) {
      // RFC 6749 §3.1: parameters must not be repeated.
      if (params.getAll(key).length > 1) return null;
      out[key] = params.get(key);
    }
    return out;
  }
  return null;
}

/** RFC 8414 authorization server metadata (also served as openid-configuration). */
export function authorizationServerMetadata() {
  const issuer = oauthIssuer();
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...SUPPORTED_SCOPES],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    service_documentation: `${issuer}/docs/agents/mcp`,
  };
}

/** RFC 9728 protected resource metadata for one of the MCP URLs. */
export function protectedResourceMetadata(resource: string) {
  return {
    resource,
    authorization_servers: [oauthIssuer()],
    scopes_supported: [...SUPPORTED_SCOPES],
    bearer_methods_supported: ['header'],
    resource_name: 'Flowershow',
    resource_documentation: `${oauthIssuer()}/docs/agents/mcp`,
  };
}

/**
 * Map the path after /.well-known/oauth-protected-resource to the resource
 * it describes: "/api/mcp/account", "/api/mcp", or "" (origin-root fallback,
 * which describes the signed-in endpoint).
 */
export function resourceForMetadataPath(suffix: string): string | null {
  if (suffix === '' || suffix === '/' || suffix === '/api/mcp/account') {
    return accountResource();
  }
  if (suffix === '/api/mcp') return anonResource();
  return null;
}
