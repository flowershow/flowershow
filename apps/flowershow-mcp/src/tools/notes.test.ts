import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(['publish-note', 'publish-local-files']),
    );
  });

  describe('publish-local-files tool', () => {
    it('uploads files from a local directory without requiring content in tool args', async () => {
      const tempRoot = await mkdtemp(join(tmpdir(), 'flowershow-mcp-'));
      const vaultDir = join(tempRoot, 'vault');
      await mkdir(join(vaultDir, 'notes'), { recursive: true });
      await mkdir(join(vaultDir, 'assets'), { recursive: true });
      await writeFile(join(vaultDir, 'index.md'), '# Home\n');
      await writeFile(join(vaultDir, 'notes', 'hello.md'), '# Hello\n');
      await writeFile(
        join(vaultDir, 'assets', 'logo.png'),
        Buffer.from([137, 80, 78, 71]),
      );

      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [
          {
            path: 'index.md',
            uploadUrl: 'https://s3.example.com/index',
            blobId: 'blob-index',
            contentType: 'text/markdown',
          },
          {
            path: 'notes/hello.md',
            uploadUrl: 'https://s3.example.com/hello',
            blobId: 'blob-hello',
            contentType: 'text/markdown',
          },
          {
            path: 'assets/logo.png',
            uploadUrl: 'https://s3.example.com/logo',
            blobId: 'blob-logo',
            contentType: 'image/png',
          },
        ],
      });
      (
        mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
      (mockApi.getSiteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteId: 'site1',
        status: 'complete',
        files: { total: 2, pending: 0, success: 2, failed: 0 },
      });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-local-files',
        arguments: {
          siteId: 'site1',
          localPath: vaultDir,
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockApi.publishFiles).toHaveBeenCalledTimes(1);
      expect(mockApi.uploadToPresignedUrl).toHaveBeenCalledTimes(3);

      const publishArg = (mockApi.publishFiles as ReturnType<typeof vi.fn>).mock
        .calls[0][1] as Array<{ path: string; size: number; sha: string }>;
      expect(publishArg.map((f) => f.path).sort()).toEqual([
        'assets/logo.png',
        'index.md',
        'notes/hello.md',
      ]);

      await rm(tempRoot, { recursive: true, force: true });
    });

    it('returns an error when localPath does not exist', async () => {
      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-local-files',
        arguments: {
          siteId: 'site1',
          localPath: '/definitely/not/a/real/path',
        },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('local path');
    });
  });

  describe('publish-note tool', () => {
    function setupHappyPath() {
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
      (
        mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
      (mockApi.getSiteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteId: 'site1',
        status: 'complete',
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
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
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

      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
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

      const publishCall = (mockApi.publishFiles as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(publishCall[0]).toBe('site1'); // siteId
      expect(publishCall[1][0].path).toBe('notes/hello.md');
      expect(publishCall[1][0].size).toBe(Buffer.byteLength(content, 'utf8'));
      expect(publishCall[1][0].sha).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    });

    it('passes contentType from UploadTarget to uploadToPresignedUrl', async () => {
      setupHappyPath();
      const { client } = await createTestClient(mockApi);

      await client.callTool({
        name: 'publish-note',
        arguments: {
          siteId: 'site1',
          path: 'notes/hello.md',
          content: '# Hello',
        },
      });

      const uploadCall = (
        mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>
      ).mock.calls[0];
      expect(uploadCall[2]).toBe('text/markdown'); // third arg = contentType
    });

    it('polls getSiteStatus until complete', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({
        site: SITE_DETAIL,
      });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [
          {
            path: 'n.md',
            uploadUrl: 'https://s3.example.com/p',
            blobId: 'b1',
            contentType: 'text/markdown',
          },
        ],
      });
      (
        mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
      (mockApi.getSiteStatus as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          siteId: 'site1',
          status: 'pending',
          files: { total: 1, pending: 1, success: 0, failed: 0 },
        })
        .mockResolvedValueOnce({
          siteId: 'site1',
          status: 'pending',
          files: { total: 1, pending: 1, success: 0, failed: 0 },
        })
        .mockResolvedValueOnce({
          siteId: 'site1',
          status: 'complete',
          files: { total: 1, pending: 0, success: 1, failed: 0 },
        });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-note',
        arguments: { siteId: 'site1', path: 'n.md', content: '# Test' },
      });

      expect(result.isError).toBeFalsy();
      expect(mockApi.getSiteStatus).toHaveBeenCalledTimes(3);
    });

    it('returns error when status is error', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({
        site: SITE_DETAIL,
      });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [
          {
            path: 'n.md',
            uploadUrl: 'https://s3.example.com/p',
            blobId: 'b1',
            contentType: 'text/markdown',
          },
        ],
      });
      (
        mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
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
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('error');
    });

    it('returns timeout error if status never becomes complete', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({
        site: SITE_DETAIL,
      });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [
          {
            path: 'n.md',
            uploadUrl: 'https://s3.example.com/p',
            blobId: 'b1',
            contentType: 'text/markdown',
          },
        ],
      });
      (
        mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
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
      registerNoteTools(server, mockApi, {
        pollIntervalMs: 0,
        maxPollAttempts: 3,
      });
      const client = new Client({ name: 'test-client', version: '0.0.1' });
      const [ct, st] = InMemoryTransport.createLinkedPair();
      await Promise.all([client.connect(ct), server.connect(st)]);

      const result = await client.callTool({
        name: 'publish-note',
        arguments: { siteId: 'site1', path: 'n.md', content: '# Test' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
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

    it('returns error when publishFiles returns empty files array', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({
        site: SITE_DETAIL,
      });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [],
      });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-note',
        arguments: {
          siteId: 'site1',
          path: 'notes/hello.md',
          content: '# Hello',
        },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('no upload targets');
    });

    it('returns auth error message when publishFiles returns 401', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({
        site: SITE_DETAIL,
      });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiError(401, 'Unauthorized', ''),
      );

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-note',
        arguments: {
          siteId: 'site1',
          path: 'notes/hello.md',
          content: '# Hello',
        },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).toContain('Authentication failed');
      expect(text).toContain('FLOWERSHOW_PAT');
    });

    it('strips leading slash from path when constructing live URL', async () => {
      (mockApi.getSite as ReturnType<typeof vi.fn>).mockResolvedValue({
        site: SITE_DETAIL,
      });
      (mockApi.publishFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [
          {
            path: '/notes/hello.md',
            uploadUrl: 'https://s3.example.com/p',
            blobId: 'b1',
            contentType: 'text/markdown',
          },
        ],
      });
      (
        mockApi.uploadToPresignedUrl as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
      (mockApi.getSiteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteId: 'site1',
        status: 'complete',
        files: { total: 1, pending: 0, success: 1, failed: 0 },
      });

      const { client } = await createTestClient(mockApi);
      const result = await client.callTool({
        name: 'publish-note',
        arguments: {
          siteId: 'site1',
          path: '/notes/hello.md',
          content: '# Hello',
        },
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).not.toContain('//notes');
      expect(text).toContain('https://my-blog.flowershow.app/notes/hello');
    });
  });
});
