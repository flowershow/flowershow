import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { type NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/lib/cli-auth';
import { realMcpDeps } from '@/lib/mcp/deps';
import { createFlowershowMcpServer, type McpMode } from '@/lib/mcp/server';

// publish waits for processing (up to ~30s) after uploading.
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message:
          'Invalid token. Omit Authorization to publish anonymously, or use a Flowershow personal access token (fs_pat_…).',
      },
      id: null,
    },
    { status: 401 },
  );
}

/**
 * Flowershow MCP endpoint (Streamable HTTP, stateless: a new server per
 * request). No Authorization header: anonymous publishing (claim links).
 * `Authorization: Bearer fs_pat_…` (or fs_cli_…): publish into that
 * account's sites.
 */
async function handle(request: NextRequest): Promise<Response> {
  let mode: McpMode = { kind: 'anon' };
  const authorization = request.headers.get('authorization');
  if (authorization) {
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';
    const auth = token ? await validateAccessToken(request) : null;
    if (!auth) return unauthorized();
    mode = { kind: 'user', token, userId: auth.userId };
  }

  const server = createFlowershowMcpServer(mode, realMcpDeps());
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

// Stateless: no standalone server-to-client stream (an open GET stream would
// just hold a serverless function until it times out). The spec allows 405.
export function GET() {
  return new NextResponse(null, { status: 405, headers: { allow: 'POST' } });
}

export { handle as DELETE, handle as POST };
