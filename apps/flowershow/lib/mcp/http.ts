import { randomUUID } from 'node:crypto';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CLAIM_TOKEN_PREFIX } from '@/lib/anonymous-user';
import { validateAccessToken } from '@/lib/cli-auth';
import {
  ACCESS_TOKEN_PREFIX,
  allowedResources,
  oauthEnabled,
  oauthIssuer,
  SCOPE_SITES_WRITE,
} from '@/lib/oauth/config';
import { validateOAuthAccessToken } from '@/lib/oauth/tokens';
import { getClientIp } from '@/lib/rate-limit';
import { realMcpDeps } from './deps';
import { anonCallerFrom } from './limits';
import { MAX_REQUEST_BYTES, MAX_TOTAL_BYTES } from './publish';
import {
  ACCOUNT_TOOLS,
  createFlowershowMcpServer,
  type McpMode,
  SIGN_IN_REQUIRED,
} from './server';

/**
 * Shared handler for the two MCP URLs of one server:
 *
 * - `/api/mcp` (the one we document): no Authorization header lists every
 *   tool; `publish` works anonymously (claim links) and the account tools
 *   ask for sign-in when called (lazy sign-in, see `signInGate`). A bearer
 *   token (PAT, CLI token or OAuth access token) publishes into the account.
 * - `/api/mcp/account` (requireAuth): a token is required for everything;
 *   without one the 401 carries `WWW-Authenticate: Bearer
 *   resource_metadata=...`, so clients sign in when the connector is added.
 *   Kept for connectors added with this URL.
 *
 * OAuth access tokens issued for either URL are accepted by both, since
 * they are the same resource server with the same scope.
 */

export type McpEndpoint = { requireAuth: boolean };

function rpcError(
  status: number,
  code: number,
  message: string,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { jsonrpc: '2.0', error: { code, message }, id: null },
    { status, headers },
  );
}

/** RFC 9728 §5.1 / RFC 6750 §3 challenge pointing at our resource metadata. */
export function bearerChallenge(
  endpoint: McpEndpoint,
  error?: 'invalid_token' | 'insufficient_scope',
  description?: string,
): string {
  const path = endpoint.requireAuth ? '/api/mcp/account' : '/api/mcp';
  const parts = [
    `resource_metadata="${oauthIssuer()}/.well-known/oauth-protected-resource${path}"`,
    `scope="${SCOPE_SITES_WRITE}"`,
  ];
  if (description) parts.unshift(`error_description="${description}"`);
  if (error) parts.unshift(`error="${error}"`);
  return `Bearer ${parts.join(', ')}`;
}

function unauthorized(
  endpoint: McpEndpoint,
  message: string,
  opts: { oauth: boolean; error?: 'invalid_token' },
) {
  // /api/mcp keeps its original challenge for PAT/CLI callers so nothing
  // changes for existing clients; OAuth-related answers point at metadata.
  const challenge =
    opts.oauth && oauthEnabled()
      ? bearerChallenge(endpoint, opts.error)
      : 'Bearer realm="flowershow"';
  return rpcError(401, -32001, message, { 'www-authenticate': challenge });
}

/** Resolve the caller from the Authorization header. */
async function resolveMode(
  request: NextRequest,
  endpoint: McpEndpoint,
): Promise<McpMode | NextResponse> {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    if (!endpoint.requireAuth) {
      return {
        kind: 'anon',
        signInChallenge: oauthEnabled()
          ? bearerChallenge(endpoint, 'invalid_token', SIGN_IN_REQUIRED)
          : undefined,
      };
    }
    return unauthorized(
      endpoint,
      'Sign in to Flowershow to use this endpoint (OAuth), or send a personal access token. To publish without an account, use https://flowershow.app/api/mcp.',
      { oauth: true },
    );
  }
  const match = /^bearer\s+(\S+)$/i.exec(authorization.trim());
  const token = match?.[1] ?? '';
  if (token.startsWith(CLAIM_TOKEN_PREFIX)) {
    return unauthorized(
      endpoint,
      'Claim tokens are not sent as Authorization: pass them to publish as the claimToken argument, and omit Authorization.',
      { oauth: endpoint.requireAuth },
    );
  }

  if (token.startsWith(ACCESS_TOKEN_PREFIX)) {
    const info = oauthEnabled()
      ? await validateOAuthAccessToken(token, allowedResources())
      : null;
    if (!info) {
      return unauthorized(
        endpoint,
        'The access token is invalid, expired or revoked. Sign in again.',
        { oauth: true, error: 'invalid_token' },
      );
    }
    if (!info.scopes.includes(SCOPE_SITES_WRITE)) {
      return rpcError(
        403,
        -32001,
        'The access token lacks the sites:write scope.',
        {
          'www-authenticate': bearerChallenge(endpoint, 'insufficient_scope'),
        },
      );
    }
    return {
      kind: 'user',
      userId: info.userId,
      via: 'oauth',
      scopes: info.scopes,
    };
  }

  const auth = token
    ? await validateAccessToken(
        new NextRequest(request.url, {
          headers: { authorization: `Bearer ${token}` },
        }),
      )
    : null;
  if (!auth) {
    return unauthorized(
      endpoint,
      endpoint.requireAuth
        ? 'Invalid token. Sign in to Flowershow (OAuth) or use a Flowershow personal access token (fs_pat_…).'
        : 'Invalid token. Omit Authorization to publish anonymously, or use a Flowershow personal access token (fs_pat_…).',
      { oauth: endpoint.requireAuth, error: 'invalid_token' },
    );
  }
  // Personal access and CLI tokens carry full account access.
  return {
    kind: 'user',
    userId: auth.userId,
    via: 'pat',
    scopes: [SCOPE_SITES_WRITE],
  };
}

const toolCall = z.object({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    _meta: z.record(z.string(), z.unknown()).optional(),
  }),
});

/**
 * Lazy sign-in on /api/mcp: an anonymous call to an account tool is refused
 * with 401 + `WWW-Authenticate` before the SDK runs. That is what makes
 * Claude (and MCP SDK clients) start OAuth and then retry the call; a 200
 * tool error would not. ChatGPT instead starts sign-in from a tool result
 * carrying `_meta["mcp/www_authenticate"]`, which the tool handler returns
 * (lib/mcp/server.ts), and does not start it from a 401. So its calls (marked
 * by any `openai/…` key in `_meta`, such as `openai/subject`) go through.
 */
function signInGate(mode: McpMode, body: unknown): NextResponse | null {
  if (mode.kind !== 'anon' || !mode.signInChallenge) return null;
  const call = toolCall.safeParse(body);
  if (!call.success || !Object.hasOwn(ACCOUNT_TOOLS, call.data.params.name)) {
    return null;
  }
  const meta = call.data.params._meta ?? {};
  if (Object.keys(meta).some((key) => key.startsWith('openai/'))) return null;
  return rpcError(401, -32001, SIGN_IN_REQUIRED, {
    'www-authenticate': mode.signInChallenge,
  });
}

/** Read the JSON-RPC body under the size cap; single messages only. */
async function readMessage(
  request: NextRequest,
): Promise<{ body: unknown } | NextResponse> {
  const tooLarge = () =>
    rpcError(
      413,
      -32600,
      `Request too large: publish up to about ${MAX_TOTAL_BYTES / 1024 / 1024} MB per call. For bigger sites, use the Flowershow CLI (fl): https://flowershow.app/docs/reference/cli`,
    );
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) {
    return tooLarge();
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_REQUEST_BYTES) return tooLarge();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return rpcError(400, -32700, 'Parse error: invalid JSON');
  }
  // Batches were removed from MCP (2025-06-18); allowing them would let one
  // request run many publishes at once.
  if (Array.isArray(body)) {
    return rpcError(400, -32600, 'Batch requests are not supported');
  }
  return { body };
}

/**
 * Handle one MCP request (Streamable HTTP, stateless: a new server per
 * request).
 */
export async function handleMcpRequest(
  request: NextRequest,
  endpoint: McpEndpoint,
): Promise<Response> {
  const mode = await resolveMode(request, endpoint);
  if (mode instanceof NextResponse) return mode;

  let parsedBody: unknown;
  if (request.method === 'POST') {
    const message = await readMessage(request);
    if (message instanceof NextResponse) return message;
    parsedBody = message.body;
  }
  const refused = signInGate(mode, parsedBody);
  if (refused) return refused;
  const deps =
    mode.kind === 'anon'
      ? realMcpDeps(
          anonCallerFrom(
            getClientIp(request.headers),
            request.headers,
            parsedBody,
          ),
        )
      : realMcpDeps();
  const server = createFlowershowMcpServer(mode, deps);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: MAX_REQUEST_BYTES,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(request, { parsedBody });
  return mode.kind === 'anon' && isInitialize(parsedBody)
    ? withSessionId(response)
    : response;
}

function isInitialize(body: unknown): boolean {
  return (body as { method?: unknown } | undefined)?.method === 'initialize';
}

/**
 * Hand anonymous clients an MCP session id on initialize. The server stays
 * stateless (the transport ignores the header); clients send the id back on
 * every request, which lets per-caller limits tell apart users of a chat app
 * that all call from the same IPs (lib/mcp/limits.ts). Anyone can mint new
 * ids, so per-IP and global limits still apply.
 */
function withSessionId(response: Response): Response {
  if (!response.ok || response.headers.has('mcp-session-id')) return response;
  const headers = new Headers(response.headers);
  headers.set('mcp-session-id', randomUUID());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * GET: no standalone server-to-client stream (an open GET stream would just
 * hold a serverless function until it times out); the spec allows 405. On
 * the account endpoint an unauthenticated GET still gets the 401 challenge.
 */
export async function handleMcpGet(
  request: NextRequest,
  endpoint: McpEndpoint,
): Promise<Response> {
  if (endpoint.requireAuth) {
    const mode = await resolveMode(request, endpoint);
    if (mode instanceof NextResponse) return mode;
  }
  return new NextResponse(null, { status: 405, headers: { allow: 'POST' } });
}
