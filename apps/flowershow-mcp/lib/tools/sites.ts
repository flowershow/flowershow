import type { FlowershowApiClient } from '../api-client';
import { ApiClientError } from '../api-client';
import * as errors from '../errors';
import { createLogger } from '../logger';
import * as tokenStore from '../token-store';

const log = createLogger('tools:sites');

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

// ── get_user ────────────────────────────────────────────────

export async function handleGetUser(
  client: FlowershowApiClient,
): Promise<ToolResult> {
  log.info('get_user invoked');
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const user = await client.getUser(auth);
    log.info('get_user success', { username: user.username });
    return text(
      [
        `**User Profile**`,
        `- Username: ${user.username}`,
        `- Name: ${user.name ?? '(not set)'}`,
        `- Email: ${user.email ?? '(not set)'}`,
        `- Role: ${user.role}`,
      ].join('\n'),
    );
  } catch (e) {
    return handleApiError(e, 'get_user');
  }
}

// ── list_sites ──────────────────────────────────────────────

export async function handleListSites(
  client: FlowershowApiClient,
): Promise<ToolResult> {
  log.info('list_sites invoked');
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const sites = await client.listSites(auth);
    log.info('list_sites success', { count: sites.length });

    if (sites.length === 0) {
      return text('You have no sites yet. Use create_site to create one.');
    }

    const lines = sites.map(
      (s) =>
        `- **${s.projectName}** (id: ${s.id})\n  URL: ${s.url}${s.fileCount !== undefined ? `\n  Files: ${s.fileCount}` : ''}`,
    );
    return text([`You have ${sites.length} site(s):`, '', ...lines].join('\n'));
  } catch (e) {
    return handleApiError(e, 'list_sites');
  }
}

// ── create_site ─────────────────────────────────────────────

export async function handleCreateSite(
  client: FlowershowApiClient,
  args: { projectName: string; overwrite?: boolean },
): Promise<ToolResult> {
  log.info('create_site invoked', {
    projectName: args.projectName,
    overwrite: args.overwrite,
  });
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const site = await client.createSite(auth, {
      projectName: args.projectName,
      overwrite: args.overwrite,
    });
    log.info('create_site success', {
      siteId: site.id,
      projectName: site.projectName,
    });
    return text(
      [
        `Site created successfully:`,
        `- Name: ${site.projectName}`,
        `- ID: ${site.id}`,
        `- URL: ${site.url}`,
      ].join('\n'),
    );
  } catch (e) {
    if (e instanceof ApiClientError && e.statusCode === 409) {
      log.warn('create_site conflict', { projectName: args.projectName });
      return error(errors.siteAlreadyExists(args.projectName));
    }
    return handleApiError(e, 'create_site');
  }
}

// ── get_site ────────────────────────────────────────────────

export async function handleGetSite(
  client: FlowershowApiClient,
  args: { siteId: string },
): Promise<ToolResult> {
  log.info('get_site invoked', { siteId: args.siteId });
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const site = await client.getSite(auth, args.siteId);
    log.info('get_site success', {
      siteId: args.siteId,
      projectName: site.projectName,
    });
    const lines = [
      `**Site: ${site.projectName}**`,
      `- ID: ${site.id}`,
      `- URL: ${site.url}`,
    ];
    if (site.customDomain) {
      lines.push(`- Custom Domain: ${site.customDomain}`);
    }
    if (site.fileCount !== undefined) {
      lines.push(`- Files: ${site.fileCount}`);
    }
    if (site.totalSize !== undefined) {
      lines.push(
        `- Total Size: ${(site.totalSize / 1024 / 1024).toFixed(2)} MB`,
      );
    }
    if (site.createdAt) {
      lines.push(`- Created: ${site.createdAt}`);
    }
    return text(lines.join('\n'));
  } catch (e) {
    if (e instanceof ApiClientError && e.statusCode === 404) {
      log.warn('get_site not found', { siteId: args.siteId });
      return error(errors.siteNotFound(args.siteId));
    }
    return handleApiError(e, 'get_site');
  }
}

// ── delete_site ─────────────────────────────────────────────

export async function handleDeleteSite(
  client: FlowershowApiClient,
  args: { siteId: string },
): Promise<ToolResult> {
  log.info('delete_site invoked', { siteId: args.siteId });
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    await client.deleteSite(auth, args.siteId);
    log.info('delete_site success', { siteId: args.siteId });
    return text(
      `Site ${args.siteId} has been deleted. All files and data have been removed.`,
    );
  } catch (e) {
    if (e instanceof ApiClientError && e.statusCode === 404) {
      log.warn('delete_site not found', { siteId: args.siteId });
      return error(errors.siteNotFound(args.siteId));
    }
    return handleApiError(e, 'delete_site');
  }
}

// ── get_site_status ─────────────────────────────────────────

export async function handleGetSiteStatus(
  client: FlowershowApiClient,
  args: { siteId: string },
): Promise<ToolResult> {
  log.info('get_site_status invoked', { siteId: args.siteId });
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const status = await client.getSiteStatus(auth, args.siteId);
    log.info('get_site_status success', {
      siteId: args.siteId,
      status: status.status,
    });
    return text(
      [
        `**Site Status: ${status.status}**`,
        `- Pending: ${status.pending}`,
        `- Success: ${status.success}`,
        `- Error: ${status.error}`,
        `- Total: ${status.total}`,
      ].join('\n'),
    );
  } catch (e) {
    if (e instanceof ApiClientError && e.statusCode === 404) {
      log.warn('get_site_status not found', { siteId: args.siteId });
      return error(errors.siteNotFound(args.siteId));
    }
    return handleApiError(e, 'get_site_status');
  }
}
