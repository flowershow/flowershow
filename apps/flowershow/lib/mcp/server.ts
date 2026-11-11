import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SCOPE_SITES_WRITE } from '@/lib/oauth/config';
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
  | {
      kind: 'anon';
      /**
       * `WWW-Authenticate` challenge for the account tools (lazy sign-in on
       * /api/mcp). Without it the account tools are not offered.
       */
      signInChallenge?: string;
    }
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
  /** `editor` for a site shared with the caller; `owner` for their own. */
  role: 'owner' | 'editor';
  /** Username of the site's owner. */
  owner: string;
};

export type ClaimedSite = { siteId: string; name: string; url: string };

export type SiteFile = { path: string; size: number; updatedAt: string };

/** Most paths `list-files` returns in one call (use `folder` to narrow). */
export const LIST_FILES_MAX = 1000;
/** Largest file `read-file` returns. */
export const READ_FILE_MAX_BYTES = 256 * 1024;

export interface McpDeps extends PublishDeps {
  listSites(userId: string): Promise<SiteSummary[]>;
  /**
   * Files currently on a site the user may manage, sorted by path. Throws
   * ApiError 404 (same message whether the site is missing or not theirs).
   */
  listFiles(userId: string, siteId: string): Promise<SiteFile[]>;
  /**
   * Text content of one file on a site the user may manage. Throws ApiError
   * with a message for the model when the site or file isn't there, or the
   * file is not text or is over READ_FILE_MAX_BYTES.
   */
  readFile(userId: string, siteId: string, path: string): Promise<string>;
  /** Move an anonymous site into the user's account (see lib/claim-anon-site.ts). */
  claimSite(
    userId: string,
    siteId: string,
    claimToken: string,
  ): Promise<ClaimedSite>;
}

/** Tools that act on the user's account: anonymous callers must sign in. */
export const ACCOUNT_TOOLS: Readonly<Record<string, true>> = {
  'list-sites': true,
  'list-files': true,
  'read-file': true,
  'claim-site': true,
};

/** Refusal for an anonymous call to an account tool (no quotes: it goes into a header). */
export const SIGN_IN_REQUIRED =
  'Sign in to Flowershow to use this tool (a free account).';

// OpenAI Apps SDK per-tool auth policy (`_meta.securitySchemes`).
const PUBLIC_OR_SIGNED_IN = {
  securitySchemes: [
    { type: 'noauth' },
    { type: 'oauth2', scopes: [SCOPE_SITES_WRITE] },
  ],
};
const SIGNED_IN_ONLY = {
  securitySchemes: [{ type: 'oauth2', scopes: [SCOPE_SITES_WRITE] }],
};

// How updates work, shared by both publish descriptions.
const UPDATE_RULES =
  'To remove pages or files, list their paths in delete (files can then be empty). Only when the user explicitly asks to start the site over, set replaceWholeSite to true: the files you send become the whole site and every other file is removed. If that would remove existing files, the call is refused and tells you how many and which; ask the user, then call again with confirmDeleteCount set to that number.';

// Lightweight publish check, shared by both publish descriptions (same policy
// as the Flowershow skill): show what goes out, stop only when it matters.
const CHECK_RULES =
  "Anyone with the link can see what you publish. When you publish, tell the user every path you are sending (and any paths in delete) and which site they go to: a new site, or the one being updated. Stop and ask before calling publish only when it matters: a file looks private or sensitive (drafts, personal notes, keys or passwords, data with people's names or emails), the call removes files (with delete or replaceWholeSite) the user didn't ask to remove, it would create a new site when the user meant to update one, or the set of files differs from what the user asked to publish. If the user already named the files, asked for the removal or said to go ahead, that is their yes.";

// What the model sees: phrased around what users actually ask for.
const PUBLISH_DESCRIPTION = `Publish files as a live website on Flowershow and get a shareable URL. Use when the user says "publish this", "put this online", "make this a website", "share this as a page" or "host this".

Accepts Markdown (.md, rendered as a styled page with navigation), HTML (.html, served as-is) and supporting files such as CSS, JS, JSON and images: one page or a small site, up to ${MAX_FILES} files and ${MAX_TOTAL_BYTES / 1024 / 1024} MB per call. Name the home page index.md or index.html.

${CHECK_RULES}

Without an account this creates a new site that expires in 7 days and returns a claim link: always show the user the live URL and the claim link exactly as returned, so they can keep the site. To update that site later in the conversation, call publish again with its siteId and claimToken and only the files you changed or added: files you don't send are kept as they are. ${UPDATE_RULES}`;

// Appended for anonymous callers who can sign in when an account tool is called.
const LAZY_SIGN_IN = `

To keep a site in the user's Flowershow account, call claim-site; to work with sites already in their account, use list-sites, list-files and read-file. Those tools ask the user to sign in to Flowershow first; after that, publish goes into their account.`;

// Appended to the account tools' descriptions for anonymous callers.
const SIGN_IN_NOTE =
  ' If the user is not signed in yet, calling it asks them to sign in to Flowershow first.';

const ACCOUNT_PUBLISH_DESCRIPTION = `Publish files as a live website in the user's Flowershow account and get a shareable URL. Use when the user says "publish this", "put this online", "make this a website", "share this as a page", "host this" or "update my site".

Accepts Markdown (.md, rendered as a styled page with navigation), HTML (.html, served as-is) and supporting files such as CSS, JS, JSON and images: one page or a small site, up to ${MAX_FILES} files and ${MAX_TOTAL_BYTES / 1024 / 1024} MB per call. Name the home page index.md or index.html.

${CHECK_RULES}

Without siteId this creates a new site in the account (optionally give it a name; otherwise it is named after the home page's first heading). With siteId it updates that site: send only the files you changed or added, since files you don't send are kept as they are. ${UPDATE_RULES} Use list-sites to find a site to update and list-files to see which files it already has. Before changing an existing file (for example adding a link to the home page), get its current text with read-file and send it back with your change, so nothing already on the page is lost. To keep an anonymous site published earlier in the conversation (one with a claimToken), call claim-site first.`;

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

function toolError(err: unknown, doing = 'publishing') {
  const text =
    err instanceof PublishError
      ? err.message
      : `Something went wrong while ${doing}. Please try again in a moment.`;
  if (!(err instanceof PublishError)) console.error(`MCP ${doing} error:`, err);
  return { isError: true, content: [{ type: 'text' as const, text }] };
}

/** An ApiError from a deps call carries a message meant for the model. */
function readError(err: unknown, doing: string) {
  return toolError(
    err instanceof ApiError ? new PublishError(err.message) : err,
    doing,
  );
}

/**
 * An anonymous call to an account tool. ChatGPT starts sign-in from
 * `_meta["mcp/www_authenticate"]`; other clients never get here, since
 * lib/mcp/http.ts answers them with a 401 before the SDK runs.
 */
function signInRequired(mode: Extract<McpMode, { kind: 'anon' }>) {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: `${SIGN_IN_REQUIRED} Without signing in, publish still works and returns a claim link the user can open to keep the site.`,
      },
    ],
    ...(mode.signInChallenge && {
      _meta: { 'mcp/www_authenticate': [mode.signInChallenge] },
    }),
  };
}

/**
 * A Flowershow MCP server for one request (stateless). Signed-in callers
 * (PAT, CLI or OAuth token) get `publish` into their account, `list-sites`,
 * `list-files`, `read-file` and `claim-site`. Anonymous callers get `publish`
 * (new or claim-token sites), plus the account tools when they can sign in
 * (`signInChallenge`), which then refuse with a sign-in request.
 */
export function createFlowershowMcpServer(
  mode: McpMode,
  deps: McpDeps,
): McpServer {
  const server = new McpServer({ name: 'flowershow', version: '1.0.0' });
  const signedIn = mode.kind === 'user';
  // Anonymous callers who can sign in see the account tools too (lazy sign-in).
  const offerAccountTools = signedIn || mode.signInChallenge !== undefined;
  const signInNote = signedIn ? '' : SIGN_IN_NOTE;

  server.registerTool(
    'publish',
    {
      title: 'Publish to Flowershow',
      description: signedIn
        ? ACCOUNT_PUBLISH_DESCRIPTION
        : `${PUBLISH_DESCRIPTION}${offerAccountTools ? LAZY_SIGN_IN : ''}`,
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
      _meta: PUBLIC_OR_SIGNED_IN,
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

  if (offerAccountTools) {
    server.registerTool(
      'list-sites',
      {
        title: 'List my Flowershow sites',
        description: `List the sites in the signed-in Flowershow account and sites shared with it (role editor), with their siteId (use it with list-files to see what a site has, and with publish to update it), URL and when each was last published.${signInNote}`,
        outputSchema: {
          sites: z.array(
            z.object({
              siteId: z.string(),
              name: z.string(),
              url: z.string(),
              lastPublishedAt: z.string().nullable(),
              role: z.enum(['owner', 'editor']),
              owner: z.string(),
            }),
          ),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: SIGNED_IN_ONLY,
      },
      async () => {
        if (mode.kind !== 'user') return signInRequired(mode);
        const sites = await deps.listSites(mode.userId);
        return {
          content: [
            {
              type: 'text' as const,
              text: sites.length
                ? sites
                    .map(
                      (s) =>
                        `${s.role === 'editor' ? `${s.owner}/` : ''}${s.name} (${s.siteId}): ${s.url}${s.role === 'editor' ? ' (editor)' : ''}${s.lastPublishedAt ? ` — last published ${s.lastPublishedAt}` : ''}`,
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
      'list-files',
      {
        title: 'List the files on a Flowershow site',
        description: `List the files currently on one of the signed-in user's Flowershow sites: each path, its size in bytes and when it last changed. Use it before updating a site in a new conversation, to see which pages exist, pick the right paths to update or delete, and avoid duplicating a page under a new name. Get siteId from list-sites. Returns up to ${LIST_FILES_MAX} paths; for bigger sites, pass folder to list one folder at a time.${signInNote}`,
        inputSchema: {
          siteId: z.string().describe('siteId of the site, from list-sites'),
          folder: z
            .string()
            .optional()
            .describe(
              'Only list files in this folder (and its subfolders), e.g. "blog"',
            ),
        },
        outputSchema: {
          siteId: z.string(),
          files: z.array(
            z.object({
              path: z.string(),
              size: z.number(),
              updatedAt: z.string(),
            }),
          ),
          total: z.number(),
          truncated: z.boolean(),
        },
        annotations: {
          title: 'List the files on a Flowershow site',
          readOnlyHint: true,
          openWorldHint: false,
        },
        _meta: SIGNED_IN_ONLY,
      },
      async ({ siteId, folder }) => {
        if (mode.kind !== 'user') return signInRequired(mode);
        try {
          const all = await deps.listFiles(mode.userId, siteId);
          const dir = (folder ?? '')
            .replace(/\\/g, '/')
            .replace(/^\/+|\/+$/g, '');
          const matching = dir
            ? all.filter((f) => f.path.startsWith(`${dir}/`))
            : all;
          const files = matching.slice(0, LIST_FILES_MAX);
          const truncated = matching.length > files.length;
          const where = dir ? ` in ${dir}/` : '';
          const text = files.length
            ? [
                `${matching.length} file(s)${where} on site ${siteId}${truncated ? ` (showing the first ${files.length}; pass folder to see the rest)` : ''}:`,
                ...files.map((f) => `${f.path} (${f.size} bytes)`),
              ].join('\n')
            : `No files${where} on site ${siteId}.`;
          return {
            content: [{ type: 'text' as const, text }],
            structuredContent: {
              siteId,
              files,
              total: matching.length,
              truncated,
            },
          };
        } catch (err) {
          return readError(err, 'listing files');
        }
      },
    );

    server.registerTool(
      'read-file',
      {
        title: 'Read a file on a Flowershow site',
        description: `Get the current text of one file on one of the signed-in user's Flowershow sites, e.g. index.md. Use it before changing a page that is already on the site, then publish the whole updated file, so the parts you didn't mean to change stay as they are. Text files only (Markdown, HTML, CSS, JS, JSON, ...), up to ${READ_FILE_MAX_BYTES / 1024} KB. Get siteId from list-sites and paths from list-files.${signInNote}`,
        inputSchema: {
          siteId: z.string().describe('siteId of the site, from list-sites'),
          path: z
            .string()
            .describe('Path of the file, as returned by list-files'),
        },
        outputSchema: {
          siteId: z.string(),
          path: z.string(),
          content: z.string(),
        },
        annotations: {
          title: 'Read a file on a Flowershow site',
          readOnlyHint: true,
          openWorldHint: false,
        },
        _meta: SIGNED_IN_ONLY,
      },
      async ({ siteId, path }) => {
        if (mode.kind !== 'user') return signInRequired(mode);
        const normalised = path.replace(/\\/g, '/').replace(/^\/+/, '');
        try {
          const content = await deps.readFile(mode.userId, siteId, normalised);
          return {
            content: [{ type: 'text' as const, text: content }],
            structuredContent: { siteId, path: normalised, content },
          };
        } catch (err) {
          return readError(err, 'reading the file');
        }
      },
    );

    server.registerTool(
      'claim-site',
      {
        title: 'Keep an anonymous site',
        description: `Move an anonymous site published earlier in this conversation into the signed-in user's Flowershow account, so it no longer expires and can be updated with publish using siteId alone. Use when the user wants to keep a site that was published without an account. Needs the siteId and claimToken returned by that earlier publish.${signInNote}`,
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
        _meta: SIGNED_IN_ONLY,
      },
      async ({ siteId, claimToken }) => {
        if (mode.kind !== 'user') return signInRequired(mode);
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
          return readError(err, 'claiming the site');
        }
      },
    );
  }

  return server;
}
