/**
 * MCP tools for managing Flowershow sites.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiError, type FlowershowApi } from '../lib/api.js';

export function registerSiteTools(server: McpServer, api: FlowershowApi): void {
  server.registerTool(
    'list-sites',
    {
      description: 'List all your Flowershow sites',
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

        logger(`[list-sites] ${data}`);
        return server.sendLoggingMessage({ level, data }, extra.sessionId);
      };

      try {
        await log('info', 'Fetching sites…');
        const data = await api.listSites();

        if (data.sites.length === 0) {
          await log('info', 'No sites found');
          return {
            content: [
              {
                type: 'text',
                text: 'You have no sites yet. Create one at https://flowershow.app or using the Flowershow CLI.',
              },
            ],
          };
        }

        await log(
          'info',
          `Found ${data.total} site${data.total === 1 ? '' : 's'}`,
        );

        const lines = data.sites.map(
          (s) =>
            `- **${s.projectName}** (${s.fileCount} files)\n  ${s.url}\n  Updated: ${s.updatedAt}`,
        );

        const text = `Found ${data.total} site${data.total === 1 ? '' : 's'}:\n\n${lines.join('\n\n')}`;

        return {
          content: [{ type: 'text', text }],
        };
      } catch (err) {
        if (err instanceof ApiError) {
          const message =
            err.status === 401
              ? 'Authentication failed. Check that your FLOWERSHOW_PAT is valid and not expired.'
              : `API error: ${err.message}`;
          await log('error', message);
          return {
            content: [{ type: 'text', text: message }],
            isError: true,
          };
        }

        const message = err instanceof Error ? err.message : 'Unknown error';
        await log('error', `Failed to list sites: ${message}`);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list sites: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
