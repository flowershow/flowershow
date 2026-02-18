import { createMcpHandler } from 'mcp-handler';
import { createLogger, maskToken } from '../../../lib/logger';
import * as tokenStore from '../../../lib/token-store';
import { registerTools } from '../../../lib/tools/registry';

const log = createLogger('route');

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
  const method = request.method;
  const url = new URL(request.url);

  const authHeader = request.headers.get('authorization');
  const hasToken = authHeader?.startsWith('Bearer ');

  log.info('Incoming request', {
    method,
    path: url.pathname,
    hasAuth: !!hasToken,
    token: hasToken ? maskToken(authHeader!.slice(7)) : undefined,
  });

  if (hasToken) {
    tokenStore.setToken(authHeader!.slice(7));
  } else {
    tokenStore.clearToken();
  }

  try {
    const response = await mcpHandler(request);
    log.info('Request completed', {
      method,
      path: url.pathname,
      status: response.status,
    });
    return response;
  } catch (err) {
    log.error('Request failed with unhandled error', {
      method,
      path: url.pathname,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  } finally {
    tokenStore.clearToken();
  }
}

export { handler as GET, handler as POST, handler as DELETE };
