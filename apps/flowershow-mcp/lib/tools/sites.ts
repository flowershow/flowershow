import type { FlowershowApiClient } from '../api-client';
import { ApiClientError } from '../api-client';
import * as tokenStore from '../token-store';
import * as errors from '../errors';

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
    return error(errors.notAuthenticated());
  }
  return token;
}

function handleApiError(e: unknown): ToolResult {
  if (e instanceof ApiClientError) {
    return error(errors.apiError(e.statusCode, String(e.body)));
  }
  return error(
    errors.networkError(e instanceof Error ? e.message : String(e)),
  );
}

// ── get_user ────────────────────────────────────────────────

export async function handleGetUser(
  client: FlowershowApiClient,
): Promise<ToolResult> {
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const user = await client.getUser(auth);
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
    return handleApiError(e);
  }
}

// ── list_sites ──────────────────────────────────────────────

export async function handleListSites(
  client: FlowershowApiClient,
): Promise<ToolResult> {
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const sites = await client.listSites(auth);
    if (sites.length === 0) {
      return text(
        'You have no sites yet. Use create_site to create one.',
      );
    }

    const lines = sites.map(
      (s) =>
        `- **${s.projectName}** (id: ${s.id})\n  URL: ${s.url}${s.fileCount !== undefined ? `\n  Files: ${s.fileCount}` : ''}`,
    );
    return text(
      [`You have ${sites.length} site(s):`, '', ...lines].join('\n'),
    );
  } catch (e) {
    return handleApiError(e);
  }
}

// ── create_site ─────────────────────────────────────────────

export async function handleCreateSite(
  client: FlowershowApiClient,
  args: { projectName: string; overwrite?: boolean },
): Promise<ToolResult> {
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const site = await client.createSite(auth, {
      projectName: args.projectName,
      overwrite: args.overwrite,
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
      return error(errors.siteAlreadyExists(args.projectName));
    }
    return handleApiError(e);
  }
}

// ── get_site ────────────────────────────────────────────────

export async function handleGetSite(
  client: FlowershowApiClient,
  args: { siteId: string },
): Promise<ToolResult> {
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const site = await client.getSite(auth, args.siteId);
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
      return error(errors.siteNotFound(args.siteId));
    }
    return handleApiError(e);
  }
}

// ── delete_site ─────────────────────────────────────────────

export async function handleDeleteSite(
  client: FlowershowApiClient,
  args: { siteId: string },
): Promise<ToolResult> {
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    await client.deleteSite(auth, args.siteId);
    return text(
      `Site ${args.siteId} has been deleted. All files and data have been removed.`,
    );
  } catch (e) {
    if (e instanceof ApiClientError && e.statusCode === 404) {
      return error(errors.siteNotFound(args.siteId));
    }
    return handleApiError(e);
  }
}

// ── get_site_status ─────────────────────────────────────────

export async function handleGetSiteStatus(
  client: FlowershowApiClient,
  args: { siteId: string },
): Promise<ToolResult> {
  const auth = requireAuth();
  if (typeof auth !== 'string') return auth;

  try {
    const status = await client.getSiteStatus(auth, args.siteId);
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
      return error(errors.siteNotFound(args.siteId));
    }
    return handleApiError(e);
  }
}
