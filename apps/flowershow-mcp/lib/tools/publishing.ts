import type { FlowershowApiClient } from '../api-client';
import { ApiClientError } from '../api-client';
import * as errors from '../errors';
import { createLogger } from '../logger';
import * as tokenStore from '../token-store';

const log = createLogger('tools:publishing');

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function text(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }] };
}

function error(content: { type: 'text'; text: string }): ToolResult {
  return { content: [content], isError: true };
}

function requireAuth(): string | ToolResult {
  const token = tokenStore.getToken();
  if (!token) {
    log.warn('Tool called without authentication');
    return error(errors.notAuthenticated());
  }
  return token;
}

function handleApiError(e: unknown, toolName: string): ToolResult {
  if (e instanceof ApiClientError) {
    if (e.statusCode === 404) {
      const body = e.body as { error?: string } | null;
      log.warn(`${toolName} site not found`, { body });
      return error(errors.siteNotFound(body?.error ?? 'unknown'));
    }
    log.error(`${toolName} API error`, {
      statusCode: e.statusCode,
      body: typeof e.body === 'string' ? e.body : JSON.stringify(e.body),
    });
    return error(errors.apiError(e.statusCode, String(e.body)));
  }
  const message = e instanceof Error ? e.message : String(e);
  log.error(`${toolName} unexpected error`, { error: message });
  return error(errors.networkError(message));
}

// ── Content type inference ──────────────────────────────────

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.md': 'text/markdown',
  '.mdx': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function inferContentType(path: string): string {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream';
}

// ── SHA-256 for content ─────────────────────────────────────

async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── publish_content ─────────────────────────────────────────

export interface PublishContentArgs {
  siteId: string;
  files: Array<{ path: string; content: string }>;
}

export async function handlePublishContent(
  client: FlowershowApiClient,
  args: PublishContentArgs,
): Promise<ToolResult> {
  log.info('publish_content invoked', {
    siteId: args.siteId,
    fileCount: args.files.length,
  });
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    // Build file metadata with SHA hashes
    const fileMetadata = await Promise.all(
      args.files.map(async (f) => ({
        path: f.path,
        sha: await sha256(f.content),
        size: new TextEncoder().encode(f.content).byteLength,
        contentType: inferContentType(f.path),
      })),
    );

    log.debug('publish_content: computed file metadata', {
      siteId: args.siteId,
      files: fileMetadata.map((f) => ({ path: f.path, size: f.size })),
    });

    const response = await client.publishFiles(auth, args.siteId, fileMetadata);

    // Build a map from path to content for uploads
    const contentByPath = new Map(args.files.map((f) => [f.path, f]));

    // Upload each file to its presigned URL
    const uploaded: string[] = [];
    const failed: Array<{ path: string; reason: string }> = [];

    for (const upload of response.uploads) {
      const file = contentByPath.get(upload.path);
      if (!file) continue;

      try {
        await client.uploadToPresignedUrl(
          upload.uploadUrl,
          file.content,
          inferContentType(file.path),
        );
        uploaded.push(upload.path);
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        log.error('publish_content: upload failed', {
          path: upload.path,
          reason,
        });
        failed.push({ path: upload.path, reason });
      }
    }

    log.info('publish_content complete', {
      siteId: args.siteId,
      uploaded: uploaded.length,
      unchanged: response.unchanged.length,
      failed: failed.length,
    });

    // Build result message
    const lines: string[] = [];

    if (uploaded.length > 0) {
      lines.push(
        `Published ${uploaded.length} file(s): ${uploaded.join(', ')}`,
      );
    }

    if (response.unchanged.length > 0) {
      lines.push(
        `${response.unchanged.length} file(s) unchanged: ${response.unchanged.join(', ')}`,
      );
    }

    if (failed.length > 0) {
      lines.push(`${failed.length} file(s) failed to upload:`);
      for (const f of failed) {
        lines.push(`  - ${f.path}: ${f.reason}`);
      }
    }

    if (lines.length === 0) {
      lines.push('No files to publish.');
    }

    return text(lines.join('\n'));
  } catch (e) {
    return handleApiError(e, 'publish_content');
  }
}

// ── sync_site ───────────────────────────────────────────────

export interface SyncSiteArgs {
  siteId: string;
  manifest: Array<{
    path: string;
    sha: string;
    size: number;
    contentType?: string;
  }>;
  dryRun?: boolean;
}

export async function handleSyncSite(
  client: FlowershowApiClient,
  args: SyncSiteArgs,
): Promise<ToolResult> {
  log.info('sync_site invoked', {
    siteId: args.siteId,
    manifestSize: args.manifest.length,
    dryRun: args.dryRun,
  });
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const response = await client.syncSite(
      auth,
      args.siteId,
      args.manifest,
      args.dryRun ?? false,
    );

    log.info('sync_site complete', {
      siteId: args.siteId,
      toUpload: response.toUpload.length,
      toUpdate: response.toUpdate.length,
      unchanged: response.unchanged.length,
      deleted: response.deleted.length,
    });

    const lines: string[] = [];

    if (args.dryRun) {
      lines.push('**Dry run** — no changes applied.');
    }

    lines.push(`Sync results for site ${args.siteId}:`);

    if (response.toUpload.length > 0) {
      lines.push(
        `- ${response.toUpload.length} file(s) to upload: ${response.toUpload.map((u) => u.path).join(', ')}`,
      );
    }

    if (response.toUpdate.length > 0) {
      lines.push(
        `- ${response.toUpdate.length} file(s) to update: ${response.toUpdate.map((u) => u.path).join(', ')}`,
      );
    }

    if (response.unchanged.length > 0) {
      lines.push(
        `- ${response.unchanged.length} unchanged: ${response.unchanged.join(', ')}`,
      );
    }

    if (response.deleted.length > 0) {
      lines.push(
        `- ${response.deleted.length} deleted: ${response.deleted.join(', ')}`,
      );
    }

    return text(lines.join('\n'));
  } catch (e) {
    return handleApiError(e, 'sync_site');
  }
}

// ── delete_files ────────────────────────────────────────────

export interface DeleteFilesArgs {
  siteId: string;
  paths: string[];
}

export async function handleDeleteFiles(
  client: FlowershowApiClient,
  args: DeleteFilesArgs,
): Promise<ToolResult> {
  log.info('delete_files invoked', {
    siteId: args.siteId,
    pathCount: args.paths.length,
  });
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const response = await client.deleteFiles(auth, args.siteId, args.paths);

    log.info('delete_files complete', {
      siteId: args.siteId,
      deleted: response.deleted.length,
      notFound: response.notFound.length,
    });

    const lines: string[] = [];

    if (response.deleted.length > 0) {
      lines.push(
        `Deleted ${response.deleted.length} file(s): ${response.deleted.join(', ')}`,
      );
    }

    if (response.notFound.length > 0) {
      lines.push(
        `${response.notFound.length} file(s) not found: ${response.notFound.join(', ')}`,
      );
    }

    if (lines.length === 0) {
      lines.push('No files were deleted.');
    }

    return text(lines.join('\n'));
  } catch (e) {
    return handleApiError(e, 'delete_files');
  }
}
