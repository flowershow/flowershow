import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  type PublishDeps,
  PublishError,
  publish,
} from './publish';

export type McpMode =
  | { kind: 'anon' }
  | { kind: 'user'; token: string; userId: string };

export type SiteSummary = { siteId: string; name: string; url: string };

export interface McpDeps extends PublishDeps {
  listSites(userId: string): Promise<SiteSummary[]>;
}

// What the model sees: phrased around what users actually ask for.
const PUBLISH_DESCRIPTION = `Publish files as a live website on Flowershow and get a shareable URL. Use when the user says "publish this", "put this online", "make this a website", "share this as a page" or "host this".

Accepts Markdown (.md, rendered as a styled page with navigation), HTML (.html, served as-is) and supporting files such as CSS, JS, JSON and images: one page or a small site, up to ${MAX_FILES} files and ${MAX_TOTAL_BYTES / 1024 / 1024} MB per call. Name the home page index.md or index.html.

Without an account this creates a new site that expires in 7 days and returns a claim link: always show the user the live URL and the claim link exactly as returned, so they can keep the site. To update that site later in the conversation, call publish again with its siteId and claimToken and the complete set of files: the files you send replace the site's content, and files left out are removed. For bigger sites, suggest the Flowershow CLI (fl).`;

const fileShape = z.object({
  path: z
    .string()
    .describe('Relative path, e.g. "index.html" or "img/logo.png"'),
  content: z.string().optional().describe('Text content (UTF-8)'),
  contentBase64: z
    .string()
    .optional()
    .describe('Binary content, base64-encoded (images etc.)'),
});

const publishOutput = {
  liveUrl: z.string(),
  siteId: z.string(),
  claimUrl: z.string().optional(),
  claimToken: z.string().optional(),
  expiresAt: z.string().optional(),
  message: z.string(),
};

function toolError(err: unknown) {
  const text =
    err instanceof PublishError
      ? err.message
      : 'Something went wrong while publishing. Please try again in a moment.';
  if (!(err instanceof PublishError)) console.error('MCP publish error:', err);
  return { isError: true, content: [{ type: 'text' as const, text }] };
}

/**
 * A Flowershow MCP server for one request (stateless). Anonymous callers get
 * `publish` (new or claim-token sites); account-token callers also get
 * `list-sites` and publish into their own sites by siteId.
 */
export function createFlowershowMcpServer(
  mode: McpMode,
  deps: McpDeps,
): McpServer {
  const server = new McpServer({ name: 'flowershow', version: '1.0.0' });

  server.registerTool(
    'publish',
    {
      title: 'Publish to Flowershow',
      description: PUBLISH_DESCRIPTION,
      inputSchema: {
        files: z.array(fileShape).describe('The complete set of site files'),
        siteId: z
          .string()
          .optional()
          .describe('Update this existing site instead of creating a new one'),
        claimToken: z
          .string()
          .optional()
          .describe(
            'The claimToken returned when the anonymous site was created (needed with siteId when not signed in)',
          ),
      },
      outputSchema: publishOutput,
      annotations: {
        title: 'Publish to Flowershow',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const result = await publish(
          args,
          mode.kind === 'user' ? { kind: 'user', token: mode.token } : mode,
          deps,
        );
        return {
          content: [{ type: 'text' as const, text: result.message }],
          structuredContent: result,
        };
      } catch (err) {
        return toolError(err);
      }
    },
  );

  if (mode.kind === 'user') {
    server.registerTool(
      'list-sites',
      {
        title: 'List my Flowershow sites',
        description:
          'List the sites in the signed-in Flowershow account, with their siteId (use it with publish) and URL.',
        outputSchema: {
          sites: z.array(
            z.object({ siteId: z.string(), name: z.string(), url: z.string() }),
          ),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => {
        const sites = await deps.listSites(mode.userId);
        return {
          content: [
            {
              type: 'text' as const,
              text: sites.length
                ? sites
                    .map((s) => `${s.name} (${s.siteId}): ${s.url}`)
                    .join('\n')
                : 'No sites yet.',
            },
          ],
          structuredContent: { sites },
        };
      },
    );
  }

  return server;
}
