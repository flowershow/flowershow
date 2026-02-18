/**
 * MCP tools for managing Flowershow sites.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiError, type FlowershowApi } from '../lib/api.js';

export function registerSiteTools(server: McpServer, api: FlowershowApi): void {
  server.tool('list-sites', 'List all your Flowershow sites', {}, async () => {
    try {
      const data = await api.listSites();

      if (data.sites.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'You have no sites yet. Create one at https://flowershow.app or using the Flowershow CLI.',
            },
          ],
        };
      }

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
        return {
          content: [{ type: 'text', text: message }],
          isError: true,
        };
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
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
  });
}
