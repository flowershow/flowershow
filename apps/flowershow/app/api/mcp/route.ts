import type { NextRequest } from 'next/server';
import { handleMcpGet, handleMcpRequest } from '@/lib/mcp/http';

// publish uploads, then waits up to ~35s for processing.
export const maxDuration = 60;

const ENDPOINT = { requireAuth: false };

/**
 * Flowershow MCP endpoint (Streamable HTTP, stateless), the one we document.
 * No Authorization header: anonymous publishing (claim links); the account
 * tools ask for sign-in when called (lazy sign-in). A bearer token (fs_pat_…,
 * fs_cli_… or an OAuth access token): publish into that account's sites.
 * See lib/mcp/http.ts.
 */
function handle(request: NextRequest) {
  return handleMcpRequest(request, ENDPOINT);
}

export function GET(request: NextRequest) {
  return handleMcpGet(request, ENDPOINT);
}

export { handle as DELETE, handle as POST };
