import { createHash } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { publishNoteInputShape } from '../contracts.js';
import { ApiError, type FlowershowApi } from '../lib/api.js';

interface NoteToolOpts {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeSha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function registerNoteTools(
  server: McpServer,
  api: FlowershowApi,
  opts: NoteToolOpts = {},
): void {
  const pollIntervalMs = opts.pollIntervalMs ?? 2000;
  const maxPollAttempts = opts.maxPollAttempts ?? 15;

  server.registerTool(
    'publish-note',
    {
      description:
        'Publish a markdown note to a Flowershow site. Uploads the content and waits until the note is live. Use list-sites first to get the siteId.',
      inputSchema: publishNoteInputShape,
    },
    async ({ siteId, path, content }, extra) => {
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
        logger(`[publish-note] ${data}`);
        return server.sendLoggingMessage({ level, data }, extra.sessionId);
      };

      // 1. Get site URL (needed to construct the live note URL)
      let siteUrl: string;
      try {
        await log('info', `Fetching site ${siteId}…`);
        const { site } = await api.getSite(siteId);
        siteUrl = site.url;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.status === 404
              ? `Site not found. Use list-sites to find valid site IDs.`
              : `Failed to get site: ${err.message}`
            : `Failed to get site: ${err instanceof Error ? err.message : 'Unknown error'}`;
        await log('error', message);
        return { content: [{ type: 'text', text: message }], isError: true };
      }

      // 2. Request presigned upload URL
      const sha = computeSha256(content);
      const size = Buffer.byteLength(content, 'utf8');

      let uploadUrl: string;
      let contentType: string;
      try {
        await log('info', `Requesting upload URL for ${path}…`);
        const { files } = await api.publishFiles(siteId, [{ path, size, sha }]);
        if (files.length === 0) {
          const message = 'Upload request returned no upload targets.';
          await log('error', message);
          return { content: [{ type: 'text', text: message }], isError: true };
        }
        uploadUrl = files[0].uploadUrl;
        contentType = files[0].contentType;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.status === 401
              ? 'Authentication failed. Check that your FLOWERSHOW_PAT is valid.'
              : `Failed to request upload URL: ${err.message}`
            : `Failed to request upload URL: ${err instanceof Error ? err.message : 'Unknown error'}`;
        await log('error', message);
        return { content: [{ type: 'text', text: message }], isError: true };
      }

      // 3. Upload content to presigned URL
      try {
        await log('info', 'Uploading content…');
        await api.uploadToPresignedUrl(uploadUrl, content, contentType);
      } catch (err) {
        const message = `Failed to upload note content: ${err instanceof Error ? err.message : 'Unknown error'}`;
        await log('error', message);
        return { content: [{ type: 'text', text: message }], isError: true };
      }

      // 4. Poll for processing completion
      await log('info', 'Waiting for processing…');
      for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
        if (attempt > 0) {
          await sleep(pollIntervalMs);
        }
        try {
          const status = await api.getSiteStatus(siteId);
          if (status.status === 'complete') {
            const liveUrl = `${siteUrl}/${path.replace(/\.mdx?$/, '').replace(/^\//, '')}`;
            await log('info', `Note published: ${liveUrl}`);
            return {
              content: [
                {
                  type: 'text',
                  text: `Note published successfully!\n\nLive URL: ${liveUrl}`,
                },
              ],
            };
          }
          if (status.status === 'error') {
            const message = `Publishing failed: the server reported an error processing the note.`;
            await log('error', message);
            return {
              content: [{ type: 'text', text: message }],
              isError: true,
            };
          }
          // status === 'pending' — continue polling
        } catch (err) {
          if (
            err instanceof ApiError &&
            (err.status === 401 || err.status === 403)
          ) {
            const message =
              err.status === 401
                ? 'Authentication failed. Check that your FLOWERSHOW_PAT is valid.'
                : `API error during status check: ${err.message}`;
            await log('error', message);
            return {
              content: [{ type: 'text', text: message }],
              isError: true,
            };
          }
          // Transient error — continue polling
        }
      }

      const timeoutMessage = `Publishing timed out after ${maxPollAttempts} attempts. The note may still be processing — check your site in a moment.`;
      await log('error', timeoutMessage);
      return {
        content: [{ type: 'text', text: timeoutMessage }],
        isError: true,
      };
    },
  );
}
