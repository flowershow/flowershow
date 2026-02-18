import { createMcpHandler } from 'mcp-handler';
import * as tokenStore from '../../../lib/token-store';
import { registerTools } from '../../../lib/tools/registry';

const mcpHandler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: {
      name: 'Flowershow MCP',
      version: '0.1.0',
    },
    capabilities: {
      tools: {},
    },
  },
  {
    basePath: '/api',
    verboseLogs: process.env.NODE_ENV === 'development',
  },
);

/**
 * Wrap the MCP handler to extract the PAT from the Authorization header
 * and make it available to tool handlers via the token store.
 *
 * Clients pass their PAT in the MCP config:
 *
 *   {
 *     "mcpServers": {
 *       "flowershow": {
 *         "type": "http",
 *         "url": "https://mcp.flowershow.app/api/mcp",
 *         "headers": {
 *           "Authorization": "Bearer ${FLOWERSHOW_PAT}"
 *         }
 *       }
 *     }
 *   }
 */
async function handler(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    tokenStore.setToken(authHeader.slice(7));
  } else {
    tokenStore.clearToken();
  }

  try {
    return await mcpHandler(request);
  } finally {
    tokenStore.clearToken();
  }
}

export { handler as GET, handler as POST, handler as DELETE };
