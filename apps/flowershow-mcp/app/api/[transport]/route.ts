import { createMcpHandler } from 'mcp-handler';
import { registerTools } from '../../../lib/tools/registry';

const handler = createMcpHandler(
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

export { handler as GET, handler as POST, handler as DELETE };
