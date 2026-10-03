import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { NextRequest, NextResponse } from 'next/server';
import { CLAIM_TOKEN_PREFIX } from '@/lib/anonymous-user';
import { validateAccessToken } from '@/lib/cli-auth';
import { realMcpDeps } from '@/lib/mcp/deps';
import { MAX_REQUEST_BYTES, MAX_TOTAL_BYTES } from '@/lib/mcp/publish';
import { createFlowershowMcpServer, type McpMode } from '@/lib/mcp/server';

// publish uploads, then waits up to ~35s for processing.
export const maxDuration = 60;

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

function unauthorized(message: string) {
  return rpcError(401, -32001, message, {
    'www-authenticate': 'Bearer realm="flowershow"',
  });
}

/** Resolve the caller from the Authorization header: anonymous, or an account token. */
async function resolveMode(
  request: NextRequest,
): Promise<McpMode | NextResponse> {
  const authorization = request.headers.get('authorization');
  if (!authorization) return { kind: 'anon' };
  const match = /^bearer\s+(\S+)$/i.exec(authorization.trim());
  const token = match?.[1] ?? '';
  if (token.startsWith(CLAIM_TOKEN_PREFIX)) {
    return unauthorized(
      'Claim tokens are not sent as Authorization: pass them to publish as the claimToken argument, and omit Authorization.',
    );
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
      'Invalid token. Omit Authorization to publish anonymously, or use a Flowershow personal access token (fs_pat_…).',
    );
  }
  return { kind: 'user', token, userId: auth.userId };
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
 * Flowershow MCP endpoint (Streamable HTTP, stateless: a new server per
 * request). No Authorization header: anonymous publishing (claim links).
 * `Authorization: Bearer fs_pat_…` (or fs_cli_…): publish into that
 * account's sites.
 */
async function handle(request: NextRequest): Promise<Response> {
  const mode = await resolveMode(request);
  if (mode instanceof NextResponse) return mode;

  let parsedBody: unknown;
  if (request.method === 'POST') {
    const message = await readMessage(request);
    if (message instanceof NextResponse) return message;
    parsedBody = message.body;
  }

  const server = createFlowershowMcpServer(mode, realMcpDeps());
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: MAX_REQUEST_BYTES,
  });
  await server.connect(transport);
  return transport.handleRequest(request, { parsedBody });
}

// Stateless: no standalone server-to-client stream (an open GET stream would
// just hold a serverless function until it times out). The spec allows 405.
export function GET() {
  return new NextResponse(null, { status: 405, headers: { allow: 'POST' } });
}

export { handle as DELETE, handle as POST };
