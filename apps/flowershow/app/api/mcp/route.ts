// Flowershow MCP endpoint (Streamable HTTP, stateless). No Authorization
// header: anonymous publishing (claim links); the account tools ask for
// sign-in when called (lazy sign-in). A bearer token (fs_pat_…, fs_cli_… or
// an OAuth access token): publish into that account's sites. See
// lib/mcp/http.ts.
export {
  handleMcpGet as GET,
  handleMcpRequest as DELETE,
  handleMcpRequest as POST,
} from '@/lib/mcp/http';

// publish uploads, then waits up to ~35s for processing.
export const maxDuration = 60;
