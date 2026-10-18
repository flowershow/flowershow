import type { NextRequest } from 'next/server';
import { handleMcpGet, handleMcpRequest } from '@/lib/mcp/http';
import { disabledResponse } from '@/lib/oauth/http';

// publish uploads, then waits up to ~35s for processing.
export const maxDuration = 60;

const ENDPOINT = { requireAuth: true };

/**
 * Signed-in Flowershow MCP endpoint (flowershow-3fr.3): a token is required.
 * Without one it answers 401 with `WWW-Authenticate: Bearer
 * resource_metadata=…`, so Claude and ChatGPT start OAuth sign-in. Accepts
 * OAuth access tokens issued for this URL, and PAT/CLI tokens.
 */
function handle(request: NextRequest) {
  return disabledResponse() ?? handleMcpRequest(request, ENDPOINT);
}

export function GET(request: NextRequest) {
  return disabledResponse() ?? handleMcpGet(request, ENDPOINT);
}

export { handle as DELETE, handle as POST };
