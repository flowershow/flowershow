/**
 * MCP tools for managing Flowershow sites.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createSiteInputShape, getSiteInputShape } from '../contracts.js';
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
            `- **${s.projectName}** (${s.fileCount} files)\n  ID: ${s.id}\n  ${s.url}\n  Updated: ${s.updatedAt}`,
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

  // ── get-site ──────────────────────────────────────────────────────────────
  server.registerTool(
    'get-site',
    {
      description: 'Get details for a specific Flowershow site',
      inputSchema: getSiteInputShape,
    },
    async ({ siteId }, extra) => {
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
        logger(`[get-site] ${data}`);
        return server.sendLoggingMessage({ level, data }, extra.sessionId);
      };

      try {
        await log('info', `Fetching site ${siteId}…`);
        const { site } = await api.getSite(siteId);
        await log('info', `Found site: ${site.projectName}`);
        const text = [
          `**${site.projectName}**`,
          `URL: ${site.url}`,
          `Plan: ${site.plan}`,
          `Privacy: ${site.privacyMode}`,
          `Files: ${site.fileCount} files (${(site.totalSize / 1024).toFixed(1)} KB)`,
          `Comments: ${site.enableComments ? 'enabled' : 'disabled'}`,
          `Search: ${site.enableSearch ? 'enabled' : 'disabled'}`,
          `GitHub: ${site.ghRepository ?? 'not connected'}`,
          `Custom domain: ${site.customDomain ?? 'none'}`,
          `Updated: ${site.updatedAt}`,
        ].join('\n');
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.status === 404
              ? `Site not found. Check the site ID.`
              : `API error: ${err.message}`
            : `Failed to get site: ${err instanceof Error ? err.message : 'Unknown error'}`;
        await log('error', message);
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );

  // ── create-site ────────────────────────────────────────────────────────────
  server.registerTool(
    'create-site',
    {
      description: 'Create a new Flowershow site',
      inputSchema: createSiteInputShape,
    },
    async ({ projectName, overwrite }, extra) => {
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
        logger(`[create-site] ${data}`);
        return server.sendLoggingMessage({ level, data }, extra.sessionId);
      };

      try {
        await log('info', `Creating site "${projectName}"…`);
        const { site } = await api.createSite(projectName, overwrite);
        await log('info', `Site created: ${site.projectName}`);
        const text = `Site created!\n\n**${site.projectName}**\nURL: ${site.url}\nID: ${site.id}`;
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        let message: string;
        if (err instanceof ApiError) {
          if (err.status === 409) {
            message = `Site "${projectName}" already exists. Use overwrite: true to reset it, or choose a different name.`;
          } else if (err.status === 400) {
            message = `Invalid project name: ${err.message}`;
          } else {
            message = `API error: ${err.message}`;
          }
        } else {
          message = `Failed to create site: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
        await log('error', message);
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );
}
