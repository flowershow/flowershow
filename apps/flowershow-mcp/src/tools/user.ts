import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiError, type FlowershowApi } from '../lib/api.js';

export function registerUserTools(server: McpServer, api: FlowershowApi): void {
  server.registerTool(
    'get-user',
    {
      description: 'Get the current authenticated Flowershow user profile',
    },
    async (extra) => {
      const log = (
        level: 'info' | 'debug' | 'warning' | 'error',
        data: string,
      ) => {
        const logger =
          level === 'error'
            ? console.error
            : level === 'warning'
              ? console.warn
              : level === 'debug'
                ? console.debug
                : console.info;
        logger(`[get-user] ${data}`);
        return server.sendLoggingMessage({ level, data }, extra.sessionId);
      };

      try {
        await log('info', 'Fetching user profile…');
        const user = await api.getUser();
        await log('info', `Authenticated as: ${user.username}`);
        const text = [
          `**${user.username}**`,
          user.name ? `Name: ${user.name}` : null,
          user.email ? `Email: ${user.email}` : null,
          `Role: ${user.role}`,
        ]
          .filter(Boolean)
          .join('\n');
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.status === 401
              ? 'Authentication failed. Check that your FLOWERSHOW_PAT is valid.'
              : `API error: ${err.message}`
            : `Failed to get user: ${err instanceof Error ? err.message : 'Unknown error'}`;
        await log('error', message);
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );
}
