# Flowershow MCP Full Tool Set Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add five new MCP tools to the Flowershow MCP server — `get-site`, `get-user`, `create-site`, `delete-site`, and `publish-note` — enabling AI agents to fully manage sites and publish in-memory markdown as notes.

**Architecture:** The API client (`lib/api.ts`) is extended with typed methods for each new operation. Tools are organized by domain: site management in `tools/sites.ts`, user info in `tools/user.ts`, and note publishing in `tools/notes.ts`. `publish-note` is self-contained: it calls `getSite` for the URL, uploads via presigned URL, and polls for processing completion before returning the live note URL.

**Tech Stack:** TypeScript, Node.js 20+, `@modelcontextprotocol/sdk` v1, Express 5, Vitest, Node built-in `crypto` module (SHA-256)

---

## Task 1: Extend FlowershowApi with new types and methods

**Files:**
- Modify: `apps/flowershow-mcp/src/lib/api.ts`

No direct tests needed — the API client is fully exercised through tool tests (same pattern as existing code). However, the types need to be correct for TypeScript to compile.

**Step 1: Add new types to `api.ts`**

After the existing `ListSitesResponse` interface, add:

```typescript
export interface SiteDetail {
  id: string;
  projectName: string;
  ghRepository: string | null;
  ghBranch: string | null;
  customDomain: string | null;
  rootDir: string | null;
  autoSync: boolean;
  plan: 'FREE' | 'PREMIUM';
  privacyMode: 'PUBLIC' | 'PASSWORD';
  enableComments: boolean;
  enableSearch: boolean;
  syntaxMode: string;
  url: string;
  fileCount: number;
  totalSize: number;
  updatedAt: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN';
}

export interface FileMetadata {
  path: string;
  size: number;
  sha: string;
}

export interface UploadTarget {
  path: string;
  uploadUrl: string;
  blobId: string;
  contentType: string;
}

export interface PublishFilesResponse {
  files: UploadTarget[];
}

export interface StatusResponse {
  siteId: string;
  status: 'pending' | 'complete' | 'error';
  files: {
    total: number;
    pending: number;
    success: number;
    failed: number;
  };
  blobs?: Array<{
    id: string;
    path: string;
    syncStatus: 'UPLOADING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';
    syncError: string | null;
    extension: string | null;
  }>;
}
```

**Step 2: Extend `request()` to support a request body**

Replace the existing `private async request<T>` method with:

```typescript
private async request<T>(
  method: string,
  path: string,
  requestBody?: unknown,
): Promise<T> {
  const url = `${this.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${this.pat}`,
      Accept: 'application/json',
      ...(requestBody !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    ...(requestBody !== undefined
      ? { body: JSON.stringify(requestBody) }
      : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, res.statusText, text);
  }

  return (await res.json()) as T;
}
```

**Step 3: Add new methods to `FlowershowApi`**

After the existing `listSites()` method, add:

```typescript
async getSite(siteId: string): Promise<{ site: SiteDetail }> {
  return this.request<{ site: SiteDetail }>('GET', `/sites/id/${siteId}`);
}

async getUser(): Promise<User> {
  return this.request<User>('GET', '/user');
}

async createSite(
  projectName: string,
  overwrite = false,
): Promise<{ site: { id: string; projectName: string; url: string } }> {
  return this.request<{
    site: { id: string; projectName: string; url: string };
  }>('POST', '/sites', { projectName, overwrite });
}

async deleteSite(siteId: string): Promise<{ success: boolean; deletedFiles: number }> {
  return this.request<{ success: boolean; deletedFiles: number }>(
    'DELETE',
    `/sites/id/${siteId}`,
  );
}

async publishFiles(
  siteId: string,
  files: FileMetadata[],
): Promise<PublishFilesResponse> {
  return this.request<PublishFilesResponse>(
    'POST',
    `/sites/id/${siteId}/files`,
    { files },
  );
}

async getSiteStatus(siteId: string): Promise<StatusResponse> {
  return this.request<StatusResponse>('GET', `/sites/id/${siteId}/status`);
}

async uploadToPresignedUrl(url: string, content: string): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown' },
    body: content,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, res.statusText, text);
  }
}
```

**Step 4: Verify TypeScript compiles**

```bash
pnpm build --filter @flowershow/mcp
```

Expected: build succeeds with no type errors.

**Step 5: Commit**

```bash
git add apps/flowershow-mcp/src/lib/api.ts
git commit -m "feat(mcp): extend API client with types and methods for all new tools"
```

---

## Task 2: Add `get-site`, `create-site`, `delete-site` tools

**Files:**
- Modify: `apps/flowershow-mcp/src/tools/sites.ts`
- Modify: `apps/flowershow-mcp/src/tools/sites.test.ts`

The existing test file tests `registerSiteTools`. You'll extend both the function and its tests. Follow the existing test pattern exactly: use `InMemoryTransport`, mock the API with `vi.fn()`.

**Step 1: Write failing tests for the three new tools**

At the top of `sites.test.ts`, update the `mockApi` to include the new methods:

```typescript
const mockApi = {
  listSites: vi.fn(),
  getSite: vi.fn(),
  createSite: vi.fn(),
  deleteSite: vi.fn(),
} as unknown as FlowershowApi;
```

Then add three new `describe` blocks after the existing `list-sites` describe:

```typescript
describe('get-site tool', () => {
  it('registers a get-site tool', async () => {
    const { client } = await createTestClient(mockApi);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('get-site');
  });

  it('returns site details on success', async () => {
    (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({
      site: {
        id: 's1',
        projectName: 'my-blog',
        url: 'https://my-blog.flowershow.app',
        plan: 'FREE',
        privacyMode: 'PUBLIC',
        enableComments: false,
        enableSearch: true,
        fileCount: 42,
        totalSize: 102400,
        updatedAt: '2025-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        ghRepository: null,
        ghBranch: null,
        customDomain: null,
        rootDir: null,
        autoSync: false,
        syntaxMode: 'obsidian',
      },
    });

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({
      name: 'get-site',
      arguments: { siteId: 's1' },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('my-blog');
    expect(text).toContain('https://my-blog.flowershow.app');
    expect(text).toContain('42 files');
    expect(result.isError).toBeFalsy();
  });

  it('returns error on 404', async () => {
    (mockApi.getSite as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(404, 'Not Found', '{"error":"not_found"}'),
    );

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({
      name: 'get-site',
      arguments: { siteId: 'bad-id' },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('not found');
  });
});

describe('create-site tool', () => {
  it('registers a create-site tool', async () => {
    const { client } = await createTestClient(mockApi);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('create-site');
  });

  it('returns new site info on success', async () => {
    (mockApi.createSite as ReturnType<typeof vi.fn>).mockResolvedValue({
      site: {
        id: 'new-site-id',
        projectName: 'my-new-blog',
        url: 'https://flowershow.app/alice/my-new-blog',
      },
    });

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({
      name: 'create-site',
      arguments: { projectName: 'my-new-blog' },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('my-new-blog');
    expect(text).toContain('https://flowershow.app/alice/my-new-blog');
    expect(result.isError).toBeFalsy();
  });

  it('returns error on 409 (site already exists)', async () => {
    (mockApi.createSite as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(409, 'Conflict', '{"error":"site_exists"}'),
    );

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({
      name: 'create-site',
      arguments: { projectName: 'existing-site' },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('already exists');
  });
});

describe('delete-site tool', () => {
  it('registers a delete-site tool', async () => {
    const { client } = await createTestClient(mockApi);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('delete-site');
  });

  it('returns success message with deleted file count', async () => {
    (mockApi.deleteSite as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      deletedFiles: 17,
    });

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({
      name: 'delete-site',
      arguments: { siteId: 's1' },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('deleted');
    expect(text).toContain('17');
    expect(result.isError).toBeFalsy();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test --filter @flowershow/mcp
```

Expected: Tests fail with "get-site", "create-site", "delete-site" not registered.

**Step 3: Implement the three tools in `sites.ts`**

Add a `siteId` Zod schema import at the top:

```typescript
import { z } from 'zod';
```

Then extend `registerSiteTools` with three new `server.registerTool` calls after the existing `list-sites` registration:

```typescript
// ── get-site ──────────────────────────────────────────────────────────────
server.registerTool(
  'get-site',
  {
    description: 'Get details for a specific Flowershow site',
    inputSchema: { siteId: z.string().describe('The site ID') },
  },
  async ({ siteId }) => {
    try {
      const { site } = await api.getSite(siteId);
      const text = [
        `**${site.projectName}**`,
        `URL: ${site.url}`,
        `Plan: ${site.plan}`,
        `Privacy: ${site.privacyMode}`,
        `Files: ${site.fileCount} (${(site.totalSize / 1024).toFixed(1)} KB)`,
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
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  },
);

// ── create-site ────────────────────────────────────────────────────────────
server.registerTool(
  'create-site',
  {
    description: 'Create a new Flowershow site',
    inputSchema: {
      projectName: z
        .string()
        .describe('Site project name (alphanumeric, hyphens, underscores)'),
      overwrite: z
        .boolean()
        .optional()
        .describe('If true and site exists, reset its content'),
    },
  },
  async ({ projectName, overwrite }) => {
    try {
      const { site } = await api.createSite(projectName, overwrite);
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
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  },
);

// ── delete-site ────────────────────────────────────────────────────────────
server.registerTool(
  'delete-site',
  {
    description:
      'Delete a Flowershow site and all its content. This is irreversible.',
    inputSchema: { siteId: z.string().describe('The site ID to delete') },
  },
  async ({ siteId }) => {
    try {
      const result = await api.deleteSite(siteId);
      const text = `Site deleted successfully. ${result.deletedFiles} file${result.deletedFiles === 1 ? '' : 's'} removed.`;
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 404
            ? `Site not found. Check the site ID.`
            : `API error: ${err.message}`
          : `Failed to delete site: ${err instanceof Error ? err.message : 'Unknown error'}`;
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  },
);
```

**Step 4: Run tests and verify they pass**

```bash
pnpm test --filter @flowershow/mcp
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add apps/flowershow-mcp/src/tools/sites.ts apps/flowershow-mcp/src/tools/sites.test.ts
git commit -m "feat(mcp): add get-site, create-site, delete-site tools"
```

---

## Task 3: Add `get-user` tool

**Files:**
- Create: `apps/flowershow-mcp/src/tools/user.ts`
- Create: `apps/flowershow-mcp/src/tools/user.test.ts`

**Step 1: Create the test file**

```typescript
// apps/flowershow-mcp/src/tools/user.test.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type FlowershowApi } from '../lib/api.js';
import { registerUserTools } from './user.js';

async function createTestClient(api: FlowershowApi) {
  const server = new McpServer(
    { name: 'test', version: '0.0.1' },
    { capabilities: { logging: {} } },
  );
  registerUserTools(server, api);

  const client = new Client({ name: 'test-client', version: '0.0.1' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { client, server };
}

describe('registerUserTools', () => {
  const mockApi = {
    getUser: vi.fn(),
  } as unknown as FlowershowApi;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a get-user tool', async () => {
    const { client } = await createTestClient(mockApi);
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('get-user');
  });

  it('returns user profile on success', async () => {
    (mockApi.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'u1',
      username: 'alice',
      name: 'Alice Smith',
      email: 'alice@example.com',
      image: null,
      role: 'USER',
    });

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({ name: 'get-user', arguments: {} });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('alice');
    expect(text).toContain('Alice Smith');
    expect(result.isError).toBeFalsy();
  });

  it('handles user with null name and email', async () => {
    (mockApi.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'u2',
      username: 'bob',
      name: null,
      email: null,
      image: null,
      role: 'USER',
    });

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({ name: 'get-user', arguments: {} });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('bob');
    expect(result.isError).toBeFalsy();
  });

  it('returns auth error on 401', async () => {
    (mockApi.getUser as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(401, 'Unauthorized', ''),
    );

    const { client } = await createTestClient(mockApi);
    const result = await client.callTool({ name: 'get-user', arguments: {} });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Authentication failed');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test --filter @flowershow/mcp
```

Expected: FAIL — `Cannot find module './user.js'`

**Step 3: Create `user.ts`**

```typescript
// apps/flowershow-mcp/src/tools/user.ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiError, type FlowershowApi } from '../lib/api.js';

export function registerUserTools(server: McpServer, api: FlowershowApi): void {
  server.registerTool(
    'get-user',
    {
      description: 'Get the current authenticated Flowershow user profile',
    },
    async () => {
      try {
        const user = await api.getUser();
        const text = [
          `**${user.username}**`,
          user.name ? `Name: ${user.name}` : null,
          user.email ? `Email: ${user.email}` : null,
          `Role: ${user.role}`,
        ]
          .filter(Boolean)
          .join('\n');
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.status === 401
              ? 'Authentication failed. Check that your FLOWERSHOW_PAT is valid.'
              : `API error: ${err.message}`
            : `Failed to get user: ${err instanceof Error ? err.message : 'Unknown error'}`;
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );
}
```

**Step 4: Run tests and verify they pass**

```bash
pnpm test --filter @flowershow/mcp
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add apps/flowershow-mcp/src/tools/user.ts apps/flowershow-mcp/src/tools/user.test.ts
git commit -m "feat(mcp): add get-user tool"
```

---

## Task 4: Add `publish-note` tool

**Files:**
- Create: `apps/flowershow-mcp/src/tools/notes.ts`
- Create: `apps/flowershow-mcp/src/tools/notes.test.ts`

This is the most complex tool. It calls four API methods in sequence:
1. `getSite` — to get the site's base URL for the return value
2. `publishFiles` — to get a presigned upload URL
3. `uploadToPresignedUrl` — to PUT the markdown content
4. `getSiteStatus` (polled) — to wait for processing to complete

The `registerNoteTools` function accepts an optional `opts` parameter with `pollIntervalMs` (default 2000) and `maxPollAttempts` (default 15). Tests pass `{ pollIntervalMs: 0 }` to skip delays.

SHA-256 is computed with Node's built-in `crypto` module (no extra dependency).

**Step 1: Create the test file**

```typescript
// apps/flowershow-mcp/src/tools/notes.test.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type FlowershowApi } from '../lib/api.js';
import { registerNoteTools } from './notes.js';

const SITE_DETAIL = {
  id: 'site1',
  projectName: 'my-blog',
  url: 'https://my-blog.flowershow.app',
  plan: 'FREE' as const,
  privacyMode: 'PUBLIC' as const,
  enableComments: false,
  enableSearch: true,
  fileCount: 5,
  totalSize: 10240,
  updatedAt: '2025-01-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  ghRepository: null,
  ghBranch: null,
  customDomain: null,
  rootDir: null,
  autoSync: false,
  syntaxMode: 'obsidian',
};

async function createTestClient(api: FlowershowApi) {
  const server = new McpServer(
    { name: 'test', version: '0.0.1' },
    { capabilities: { logging: {} } },
  );
  // pollIntervalMs: 0 makes polling instant in tests
  registerNoteTools(server, api, { pollIntervalMs: 0 });

  const client = new Client({ name: 'test-client', version: '0.0.1' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { client, server };
}

describe('registerNoteTools', () => {
  const mockApi = {
    getSite: vi.fn(),
    publishFiles: vi.fn(),
    uploadToPresignedUrl: vi.fn(),
    getSiteStatus: vi.fn(),
  } as unknown as FlowershowApi;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a publish-note tool', async () => {
    const { client } = await createTestClient(mockApi);
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('publish-note');
  });

  describe('publish-note tool', () => {
    function setupHappyPath(statusOverrides: Partial<{ status: string }> = {}) {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({
        site: SITE_DETAIL,
      });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [
          {
            path: 'notes/hello.md',
            uploadUrl: 'https://s3.example.com/presigned',
            blobId: 'blob1',
            contentType: 'text/markdown',
          },
        ],
      });
      (mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockApi.getSiteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteId: 'site1',
        status: statusOverrides.status ?? 'complete',
        files: { total: 1, pending: 0, success: 1, failed: 0 },
      });
    }

    it('returns the live note URL on success', async () => {
      setupHappyPath();
      const { client } = await createTestClient(mockApi);

      const result = await client.callTool({
        name: 'publish-note',
        arguments: {
          siteId: 'site1',
          path: 'notes/hello.md',
          content: '# Hello\n\nWorld',
        },
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain('https://my-blog.flowershow.app/notes/hello');
    });

    it('strips .md extension from the live URL', async () => {
      setupHappyPath();
      const { client } = await createTestClient(mockApi);

      const result = await client.callTool({
        name: 'publish-note',
        arguments: {
          siteId: 'site1',
          path: 'my-note.md',
          content: '# My Note',
        },
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain('https://my-blog.flowershow.app/my-note');
      expect(text).not.toContain('.md');
    });

    it('calls publishFiles with correct SHA and size', async () => {
      setupHappyPath();
      const { client } = await createTestClient(mockApi);
      const content = '# Hello\n\nWorld';

      await client.callTool({
        name: 'publish-note',
        arguments: { siteId: 'site1', path: 'notes/hello.md', content },
      });

      const publishCall = (mockApi.publishFiles as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(publishCall[0]).toBe('site1'); // siteId
      expect(publishCall[1][0].path).toBe('notes/hello.md');
      expect(publishCall[1][0].size).toBe(Buffer.byteLength(content, 'utf8'));
      expect(publishCall[1][0].sha).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    });

    it('polls getSiteStatus until complete', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({ site: SITE_DETAIL });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [{ path: 'n.md', uploadUrl: 'https://s3.example.com/p', blobId: 'b1', contentType: 'text/markdown' }],
      });
      (mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockApi.getSiteStatus as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ siteId: 'site1', status: 'pending', files: { total: 1, pending: 1, success: 0, failed: 0 } })
        .mockResolvedValueOnce({ siteId: 'site1', status: 'pending', files: { total: 1, pending: 1, success: 0, failed: 0 } })
        .mockResolvedValueOnce({ siteId: 'site1', status: 'complete', files: { total: 1, pending: 0, success: 1, failed: 0 } });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-note',
        arguments: { siteId: 'site1', path: 'n.md', content: '# Test' },
      });

      expect(result.isError).toBeFalsy();
      expect(mockApi.getSiteStatus).toHaveBeenCalledTimes(3);
    });

    it('returns error when status is error', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({ site: SITE_DETAIL });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [{ path: 'n.md', uploadUrl: 'https://s3.example.com/p', blobId: 'b1', contentType: 'text/markdown' }],
      });
      (mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockApi.getSiteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteId: 'site1',
        status: 'error',
        files: { total: 1, pending: 0, success: 0, failed: 1 },
      });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-note',
        arguments: { siteId: 'site1', path: 'n.md', content: '# Test' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain('error');
    });

    it('returns timeout error if status never becomes complete', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({ site: SITE_DETAIL });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [{ path: 'n.md', uploadUrl: 'https://s3.example.com/p', blobId: 'b1', contentType: 'text/markdown' }],
      });
      (mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockApi.getSiteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteId: 'site1',
        status: 'pending',
        files: { total: 1, pending: 1, success: 0, failed: 0 },
      });

      // Use maxPollAttempts: 3 to keep the test fast
      const server = new McpServer(
        { name: 'test', version: '0.0.1' },
        { capabilities: { logging: {} } },
      );
      registerNoteTools(server, mockApi, { pollIntervalMs: 0, maxPollAttempts: 3 });
      const client = new Client({ name: 'test-client', version: '0.0.1' });
      const [ct, st] = InMemoryTransport.createLinkedPair();
      await Promise.all([client.connect(ct), server.connect(st)]);

      const result = await client.callTool({
        name: 'publish-note',
        arguments: { siteId: 'site1', path: 'n.md', content: '# Test' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text).toContain('timed out');
    });

    it('returns API error when getSite fails', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiError(404, 'Not Found', ''),
      );

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-note',
        arguments: { siteId: 'bad', path: 'n.md', content: '# Test' },
      });

      expect(result.isError).toBe(true);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test --filter @flowershow/mcp
```

Expected: FAIL — `Cannot find module './notes.js'`

**Step 3: Create `notes.ts`**

```typescript
// apps/flowershow-mcp/src/tools/notes.ts
import { createHash } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
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
        'Publish a markdown note to a Flowershow site. Uploads the content and waits until the note is live.',
      inputSchema: {
        siteId: z.string().describe('The site ID (get it from list-sites)'),
        path: z
          .string()
          .describe(
            'File path for the note, e.g. "notes/my-note.md". Must end in .md or .mdx.',
          ),
        content: z.string().describe('The markdown content to publish'),
      },
    },
    async ({ siteId, path, content }) => {
      // 1. Get site URL (needed to construct the live note URL)
      let siteUrl: string;
      try {
        const { site } = await api.getSite(siteId);
        siteUrl = site.url;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.status === 404
              ? `Site not found. Use list-sites to find valid site IDs.`
              : `Failed to get site: ${err.message}`
            : `Failed to get site: ${err instanceof Error ? err.message : 'Unknown error'}`;
        return { content: [{ type: 'text', text: message }], isError: true };
      }

      // 2. Request presigned upload URL
      const contentBuffer = Buffer.from(content, 'utf8');
      const sha = computeSha256(content);
      const size = contentBuffer.byteLength;

      let uploadUrl: string;
      try {
        const { files } = await api.publishFiles(siteId, [{ path, size, sha }]);
        uploadUrl = files[0].uploadUrl;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `Failed to request upload URL: ${err.message}`
            : `Failed to request upload URL: ${err instanceof Error ? err.message : 'Unknown error'}`;
        return { content: [{ type: 'text', text: message }], isError: true };
      }

      // 3. Upload content to presigned URL
      try {
        await api.uploadToPresignedUrl(uploadUrl, content);
      } catch (err) {
        const message = `Failed to upload note content: ${err instanceof Error ? err.message : 'Unknown error'}`;
        return { content: [{ type: 'text', text: message }], isError: true };
      }

      // 4. Poll for processing completion
      for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
        if (attempt > 0) {
          await sleep(pollIntervalMs);
        }
        try {
          const status = await api.getSiteStatus(siteId);
          if (status.status === 'complete') {
            const liveUrl = `${siteUrl}/${path.replace(/\.mdx?$/, '')}`;
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
            return {
              content: [
                {
                  type: 'text',
                  text: `Publishing failed: the server reported an error processing the note.`,
                },
              ],
              isError: true,
            };
          }
          // status === 'pending' — continue polling
        } catch (err) {
          // Status check failed — continue polling (transient errors)
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Publishing timed out after ${maxPollAttempts} attempts. The note may still be processing — check your site in a moment.`,
          },
        ],
        isError: true,
      };
    },
  );
}
```

**Step 4: Run tests and verify they pass**

```bash
pnpm test --filter @flowershow/mcp
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add apps/flowershow-mcp/src/tools/notes.ts apps/flowershow-mcp/src/tools/notes.test.ts
git commit -m "feat(mcp): add publish-note tool with polling"
```

---

## Task 5: Wire all tools in `app.ts` and update README

**Files:**
- Modify: `apps/flowershow-mcp/src/app.ts`
- Modify: `apps/flowershow-mcp/README.md`

**Step 1: Register all new tools in `app.ts`**

In `app.ts`, add imports for the new tool registrars:

```typescript
import { registerUserTools } from './tools/user.js';
import { registerNoteTools } from './tools/notes.js';
```

Then in `createServer`, after `registerSiteTools(server, api)`, add:

```typescript
registerUserTools(server, api);
registerNoteTools(server, api);
```

The full `createServer` function becomes:

```typescript
export function createServer(api: FlowershowApi): McpServer {
  const server = new McpServer(
    { name: 'flowershow', version: '0.1.0' },
    { capabilities: { logging: {} } },
  );

  registerSiteTools(server, api);
  registerUserTools(server, api);
  registerNoteTools(server, api);

  return server;
}
```

**Step 2: Run all tests to verify nothing broke**

```bash
pnpm test --filter @flowershow/mcp
```

Expected: All tests pass.

**Step 3: Build to verify TypeScript**

```bash
pnpm build --filter @flowershow/mcp
```

Expected: Build succeeds.

**Step 4: Update the Tools table in README.md**

Replace the existing Tools table:

```markdown
## Tools

| Tool | Description |
| --- | --- |
| `list-sites` | List all your Flowershow sites |
| `get-site` | Get details for a specific site (plan, privacy, file count, etc.) |
| `get-user` | Get current user profile |
| `create-site` | Create a new site |
| `delete-site` | Delete a site and all its content |
| `publish-note` | Publish in-memory markdown as a note to an existing site |

### Typical AI workflow

The AI agent is expected to compose tools. For example, to publish a note:

1. Call `list-sites` to find the target site and its ID
2. Call `publish-note` with `siteId`, `path`, and `content`

The `publish-note` tool uploads the content and polls until the note is live, then returns the live URL.
```

**Step 5: Commit**

```bash
git add apps/flowershow-mcp/src/app.ts apps/flowershow-mcp/README.md
git commit -m "feat(mcp): wire all new tools and update README"
```

---

## Done

Run the full test suite one final time to confirm everything is green:

```bash
pnpm test --filter @flowershow/mcp
```

All 6 tools (`list-sites`, `get-site`, `get-user`, `create-site`, `delete-site`, `publish-note`) should be registered and tested.
