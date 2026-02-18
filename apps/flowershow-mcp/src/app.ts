/**
 * Flowershow MCP Express application.
 *
 * Creates the Express app with the MCP endpoint. Separated from the
 * entry-point (`index.ts`) so the app can be imported in tests without
 * starting a listener.
 */

import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { buildMcpToolContract } from './contracts.js';
import { FlowershowApi } from './lib/api.js';
import { registerNoteTools } from './tools/notes.js';
import { registerSiteTools } from './tools/sites.js';
import { registerUserTools } from './tools/user.js';

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

export function extractPat(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length);
}

// ---------------------------------------------------------------------------
// Server factory — one per request in stateless mode
// ---------------------------------------------------------------------------

export function createServer(api: FlowershowApi): McpServer {
  const server = new McpServer(
    {
      name: 'flowershow',
      version: '0.1.0',
    },
    { capabilities: { logging: {} } },
  );

  registerSiteTools(server, api);
  registerUserTools(server, api);
  registerNoteTools(server, api);

  return server;
}

// ---------------------------------------------------------------------------
// Express app factory
// ---------------------------------------------------------------------------

export function createApp(apiBaseUrl: string) {
  const app = createMcpExpressApp();

  app.get('/mcp/contract', (_req: Request, res: Response) => {
    res.json(buildMcpToolContract());
  });

  // POST /mcp — main MCP endpoint (stateless: fresh server + transport per request)
  app.post('/mcp', async (req: Request, res: Response) => {
    console.info(`MCP ${req.method} ${req.path}`);

    const pat = extractPat(req);
    if (!pat) {
      console.warn('MCP request missing valid Authorization Bearer token');
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message:
            'Missing Authorization header. ' +
            'Set headers.Authorization to "Bearer fs_pat_..." in your MCP server config.',
        },
        id: null,
      });
      return;
    }

    const api = new FlowershowApi({ baseUrl: apiBaseUrl, pat });
    const server = createServer(api);

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  return app;
}
