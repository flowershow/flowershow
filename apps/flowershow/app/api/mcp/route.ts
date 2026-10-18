import type { NextRequest } from 'next/server';
import { handleMcpGet, handleMcpRequest } from '@/lib/mcp/http';

// publish uploads, then waits up to ~35s for processing.
export const maxDuration = 60;

const ENDPOINT = { requireAuth: false };

/**
 * Flowershow MCP endpoint (Streamable HTTP, stateless). No Authorization
 * header: anonymous publishing (claim links). `Authorization: Bearer fs_pat_…`
 * (or fs_cli_…, or an OAuth access token issued for this URL): publish into
 * that account's sites. See lib/mcp/http.ts.
 */
function handle(request: NextRequest) {
  return handleMcpRequest(request, ENDPOINT);
}

export function GET(request: NextRequest) {
  return handleMcpGet(request, ENDPOINT);
}

export { handle as DELETE, handle as POST };
