import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FlowershowApiClient } from '../api-client';
import { getConfig } from '../config';
import {
  handleDeleteFiles,
  handlePublishContent,
  handleSyncSite,
} from './publishing';
import {
  handleCreateSite,
  handleDeleteSite,
  handleGetSite,
  handleGetSiteStatus,
  handleGetUser,
  handleListSites,
} from './sites';

function makeClient(): FlowershowApiClient {
  const config = getConfig();
  return new FlowershowApiClient(config.apiUrl);
}

/**
 * Register all Flowershow MCP tools on the given server instance.
 */
export function registerTools(server: McpServer): void {
  const client = makeClient();

  // ── User tools ──────────────────────────────────────────

  server.tool(
    'get_user',
    'Get the authenticated user profile (username, email, role).',
    {},
    async () => handleGetUser(client),
  );

  // ── Site management tools ───────────────────────────────

  server.tool(
    'list_sites',
    'List all sites belonging to the authenticated user.',
    {},
    async () => handleListSites(client),
  );

  server.tool(
    'create_site',
    'Create a new Flowershow site with the given project name.',
    {
      projectName: z.string().describe('Name for the new site project'),
      overwrite: z
        .boolean()
        .optional()
        .describe('If true, overwrites an existing site with the same name'),
    },
    async (args) => handleCreateSite(client, args),
  );

  server.tool(
    'get_site',
    'Get details of a specific site by its ID.',
    {
      siteId: z.string().describe('The site ID to look up'),
    },
    async (args) => handleGetSite(client, args),
  );

  server.tool(
    'delete_site',
    'Permanently delete a site and all its files.',
    {
      siteId: z.string().describe('The site ID to delete'),
    },
    async (args) => handleDeleteSite(client, args),
  );

  server.tool(
    'get_site_status',
    'Check the processing status of a site (pending/complete/error counts).',
    {
      siteId: z.string().describe('The site ID to check status for'),
    },
    async (args) => handleGetSiteStatus(client, args),
  );

  // ── Publishing tools ────────────────────────────────────

  server.tool(
    'publish_content',
    'Publish content to a site. Accepts file paths and their text content, computes hashes, requests presigned upload URLs, and uploads each file.',
    {
      siteId: z.string().describe('The site ID to publish to'),
      files: z
        .array(
          z.object({
            path: z
              .string()
              .describe('File path relative to site root (e.g. "index.md")'),
            content: z.string().describe('The text content of the file'),
          }),
        )
        .describe('Array of files to publish'),
    },
    async (args) => handlePublishContent(client, args),
  );

  server.tool(
    'sync_site',
    'Sync a site using a file manifest. Compares SHA hashes to determine which files need uploading, updating, or deleting. Returns presigned upload URLs for changed files.',
    {
      siteId: z.string().describe('The site ID to sync'),
      manifest: z
        .array(
          z.object({
            path: z.string().describe('File path relative to site root'),
            sha: z.string().describe('SHA-256 hash of the file content'),
            size: z.number().describe('File size in bytes'),
            contentType: z
              .string()
              .optional()
              .describe('MIME type of the file'),
          }),
        )
        .describe('Array of file manifest entries'),
      dryRun: z
        .boolean()
        .optional()
        .describe(
          'If true, returns what would change without applying changes',
        ),
    },
    async (args) => handleSyncSite(client, args),
  );

  server.tool(
    'delete_files',
    'Delete specific files from a site by their paths.',
    {
      siteId: z.string().describe('The site ID to delete files from'),
      paths: z.array(z.string()).describe('Array of file paths to delete'),
    },
    async (args) => handleDeleteFiles(client, args),
  );
}
