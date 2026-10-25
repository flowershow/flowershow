import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  ApiError,
  MAX_DELETE,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  type PublishDeps,
  PublishError,
  publish,
} from './publish';

export type McpMode =
  | { kind: 'anon' }
  | {
      kind: 'user';
      userId: string;
      /** How the caller authenticated: a PAT/CLI token, or an OAuth access token. */
      via: 'pat' | 'oauth';
      scopes: string[];
    };

export type SiteSummary = {
  siteId: string;
  name: string;
  url: string;
  lastPublishedAt: string | null;
};

export type ClaimedSite = { siteId: string; name: string; url: string };

export interface McpDeps extends PublishDeps {
  listSites(userId: string): Promise<SiteSummary[]>;
  /** Move an anonymous site into the user's account (see lib/claim-anon-site.ts). */
  claimSite(
    userId: string,
    siteId: string,
    claimToken: string,
  ): Promise<ClaimedSite>;
}

// How updates work, shared by both publish descriptions.
const UPDATE_RULES =
  'To remove pages or files, list their paths in delete (files can then be empty). Only when the user explicitly asks to start the site over, set replaceWholeSite to true: the files you send become the whole site and every other file is removed. If that would remove existing files, the call is refused and tells you how many and which; ask the user, then call again with confirmDeleteCount set to that number.';

// What the model sees: phrased around what users actually ask for.
const PUBLISH_DESCRIPTION = `Publish files as a live website on Flowershow and get a shareable URL. Use when the user says "publish this", "put this online", "make this a website", "share this as a page" or "host this".

Accepts Markdown (.md, rendered as a styled page with navigation), HTML (.html, served as-is) and supporting files such as CSS, JS, JSON and images: one page or a small site, up to ${MAX_FILES} files and ${MAX_TOTAL_BYTES / 1024 / 1024} MB per call. Name the home page index.md or index.html.

Without an account this creates a new site that expires in 7 days and returns a claim link: always show the user the live URL and the claim link exactly as returned, so they can keep the site. To update that site later in the conversation, call publish again with its siteId and claimToken and only the files you changed or added: files you don't send are kept as they are. ${UPDATE_RULES} For bigger sites, suggest the Flowershow CLI (fl).`;

const ACCOUNT_PUBLISH_DESCRIPTION = `Publish files as a live website in the user's Flowershow account and get a shareable URL. Use when the user says "publish this", "put this online", "make this a website", "share this as a page", "host this" or "update my site".

Accepts Markdown (.md, rendered as a styled page with navigation), HTML (.html, served as-is) and supporting files such as CSS, JS, JSON and images: one page or a small site, up to ${MAX_FILES} files and ${MAX_TOTAL_BYTES / 1024 / 1024} MB per call. Name the home page index.md or index.html.

Without siteId this creates a new site in the account (optionally give it a name; otherwise it is named after the home page's first heading). With siteId it updates that site: send only the files you changed or added, since files you don't send are kept as they are. ${UPDATE_RULES} Use list-sites to find a site to update. To keep an anonymous site published earlier in the conversation (one with a claimToken), call claim-site first. For bigger sites, suggest the Flowershow CLI (fl).`;

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
 * `publish` (new or claim-token sites); signed-in callers (PAT, CLI or OAuth
 * token) get `publish` into their account, `list-sites` and `claim-site`.
 */
export function createFlowershowMcpServer(
  mode: McpMode,
  deps: McpDeps,
): McpServer {
  const server = new McpServer({ name: 'flowershow', version: '1.0.0' });
  const signedIn = mode.kind === 'user';

  server.registerTool(
    'publish',
    {
      title: 'Publish to Flowershow',
      description: signedIn ? ACCOUNT_PUBLISH_DESCRIPTION : PUBLISH_DESCRIPTION,
      inputSchema: {
        files: z
          .array(fileShape)
          .describe(
            'Files to add or update. When updating a site, send only the files that changed; other files are kept. Can be empty when only deleting.',
          ),
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
        delete: z
          .array(z.string())
          .max(MAX_DELETE)
          .optional()
          .describe(
            'Paths of existing files to remove from the site (with siteId), e.g. ["old-page.md"]',
          ),
        replaceWholeSite: z
          .boolean()
          .optional()
          .describe(
            'Set true only when the user asks to start the site over: the files sent become the whole site and all other files are permanently removed. Never use it to update a few pages. Default false.',
          ),
        confirmDeleteCount: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe(
            'With replaceWholeSite: the number of existing files the replace will remove, as reported by the refused first call. Set it only after the user has confirmed.',
          ),
        ...(signedIn && {
          name: z
            .string()
            .max(100)
            .optional()
            .describe('Name for a new site (only used without siteId)'),
        }),
      },
      outputSchema: publishOutput,
      annotations: {
        title: 'Publish to Flowershow',
        readOnlyHint: false,
        // Updates keep files not sent, but delete and replaceWholeSite remove files.
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const result = await publish(
          args,
          mode.kind === 'user'
            ? { kind: 'user', userId: mode.userId }
            : { kind: 'anon' },
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
          'List the sites in the signed-in Flowershow account, with their siteId (use it with publish to update a site), URL and when each was last published.',
        outputSchema: {
          sites: z.array(
            z.object({
              siteId: z.string(),
              name: z.string(),
              url: z.string(),
              lastPublishedAt: z.string().nullable(),
            }),
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
                    .map(
                      (s) =>
                        `${s.name} (${s.siteId}): ${s.url}${s.lastPublishedAt ? ` — last published ${s.lastPublishedAt}` : ''}`,
                    )
                    .join('\n')
                : 'No sites yet.',
            },
          ],
          structuredContent: { sites },
        };
      },
    );

    server.registerTool(
      'claim-site',
      {
        title: 'Keep an anonymous site',
        description:
          "Move an anonymous site published earlier in this conversation into the signed-in user's Flowershow account, so it no longer expires and can be updated with publish using siteId alone. Use when the user wants to keep a site that was published without an account. Needs the siteId and claimToken returned by that earlier publish.",
        inputSchema: {
          siteId: z.string().describe('siteId of the anonymous site'),
          claimToken: z
            .string()
            .describe(
              'claimToken returned when the anonymous site was created',
            ),
        },
        outputSchema: {
          siteId: z.string(),
          name: z.string(),
          liveUrl: z.string(),
          message: z.string(),
        },
        annotations: {
          title: 'Keep an anonymous site',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ siteId, claimToken }) => {
        try {
          const site = await deps.claimSite(mode.userId, siteId, claimToken);
          const message = `The site is now in the user's Flowershow account and will not expire: ${site.url}\n\nTo change it, call publish with siteId "${site.siteId}" (no claimToken needed).`;
          return {
            content: [{ type: 'text' as const, text: message }],
            structuredContent: {
              siteId: site.siteId,
              name: site.name,
              liveUrl: site.url,
              message,
            },
          };
        } catch (err) {
          if (err instanceof ApiError) {
            return toolError(new PublishError(err.message));
          }
          return toolError(err);
        }
      },
    );
  }

  return server;
}
