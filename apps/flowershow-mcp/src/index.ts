/**
 * Flowershow MCP Server — entry point.
 *
 * A stateless Streamable HTTP MCP server that exposes Flowershow site
 * management tools. Authenticates to the Flowershow API using a PAT
 * (Personal Access Token) forwarded from the MCP client's request headers.
 *
 * Clients configure their PAT in the MCP server config:
 *
 *   "flowershow": {
 *     "type": "remote",
 *     "url": "https://mcp.flowershow.app/mcp",
 *     "headers": {
 *       "Authorization": "Bearer fs_pat_..."
 *     }
 *   }
 */

import { createApp } from './app.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FLOWERSHOW_API_URL =
  process.env.FLOWERSHOW_API_URL ?? 'https://flowershow.app/api';

const app = createApp(FLOWERSHOW_API_URL);

export default app;
