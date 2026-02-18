import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FlowershowApiClient } from '../../api-client';
import * as tokenStore from '../../token-store';
import {
  handleDeleteFiles,
  handlePublishContent,
  handleSyncSite,
} from '../publishing';

// ── Helpers ─────────────────────────────────────────────────

function mockClient(overrides: Partial<FlowershowApiClient> = {}) {
  return {
    publishFiles: vi.fn(),
    uploadToPresignedUrl: vi.fn(),
    syncSite: vi.fn(),
    deleteFiles: vi.fn(),
    ...overrides,
  } as unknown as FlowershowApiClient;
}

// ── publish_content ─────────────────────────────────────────

describe('handlePublishContent', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  test('returns not-authenticated when no token', async () => {
    const client = mockClient();
    const result = await handlePublishContent(client, {
      siteId: 'site-1',
      files: [{ path: 'index.md', content: '# Hello' }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Not authenticated');
  });

  test('publishes files and uploads content to presigned URLs', async () => {
    tokenStore.setToken('test-token');

    const client = mockClient({
      publishFiles: vi.fn().mockResolvedValue({
        uploads: [
          { path: 'index.md', uploadUrl: 'https://s3.example.com/index.md' },
        ],
        unchanged: [],
      }),
      uploadToPresignedUrl: vi.fn().mockResolvedValue(undefined),
    });

    const result = await handlePublishContent(client, {
      siteId: 'site-1',
      files: [{ path: 'index.md', content: '# Hello' }],
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Published 1 file(s)');
    expect(client.publishFiles).toHaveBeenCalledWith(
      'test-token',
      'site-1',
      expect.arrayContaining([expect.objectContaining({ path: 'index.md' })]),
    );
    expect(client.uploadToPresignedUrl).toHaveBeenCalledWith(
      'https://s3.example.com/index.md',
      '# Hello',
      'text/markdown',
    );
  });

  test('reports unchanged files', async () => {
    tokenStore.setToken('test-token');

    const client = mockClient({
      publishFiles: vi.fn().mockResolvedValue({
        uploads: [],
        unchanged: ['readme.md'],
      }),
      uploadToPresignedUrl: vi.fn(),
    });

    const result = await handlePublishContent(client, {
      siteId: 'site-1',
      files: [{ path: 'readme.md', content: '# Readme' }],
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('unchanged');
  });

  test('reports upload failures without failing entirely', async () => {
    tokenStore.setToken('test-token');

    const client = mockClient({
      publishFiles: vi.fn().mockResolvedValue({
        uploads: [
          { path: 'a.md', uploadUrl: 'https://s3.example.com/a.md' },
          { path: 'b.md', uploadUrl: 'https://s3.example.com/b.md' },
        ],
        unchanged: [],
      }),
      uploadToPresignedUrl: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('S3 timeout')),
    });

    const result = await handlePublishContent(client, {
      siteId: 'site-1',
      files: [
        { path: 'a.md', content: '# A' },
        { path: 'b.md', content: '# B' },
      ],
    });

    // Should succeed overall but mention the failure
    expect(result.content[0].text).toContain('1 file(s) failed');
    expect(result.content[0].text).toContain('b.md');
  });

  test('handles API error from publishFiles', async () => {
    tokenStore.setToken('test-token');

    const { ApiClientError } = await import('../../api-client');
    const client = mockClient({
      publishFiles: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError(404, { error: 'Site not found' }),
        ),
    });

    const result = await handlePublishContent(client, {
      siteId: 'bad-site',
      files: [{ path: 'index.md', content: '# Hello' }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  test('infers content type from file extension', async () => {
    tokenStore.setToken('test-token');

    const client = mockClient({
      publishFiles: vi.fn().mockResolvedValue({
        uploads: [
          { path: 'style.css', uploadUrl: 'https://s3.example.com/style.css' },
        ],
        unchanged: [],
      }),
      uploadToPresignedUrl: vi.fn().mockResolvedValue(undefined),
    });

    await handlePublishContent(client, {
      siteId: 'site-1',
      files: [{ path: 'style.css', content: 'body { color: red; }' }],
    });

    expect(client.uploadToPresignedUrl).toHaveBeenCalledWith(
      'https://s3.example.com/style.css',
      'body { color: red; }',
      'text/css',
    );
  });
});

// ── sync_site ───────────────────────────────────────────────

describe('handleSyncSite', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  test('returns not-authenticated when no token', async () => {
    const client = mockClient();
    const result = await handleSyncSite(client, {
      siteId: 'site-1',
      manifest: [{ path: 'index.md', sha: 'abc123', size: 100 }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Not authenticated');
  });

  test('syncs with manifest and reports results', async () => {
    tokenStore.setToken('test-token');

    const client = mockClient({
      syncSite: vi.fn().mockResolvedValue({
        toUpload: [
          { path: 'new.md', uploadUrl: 'https://s3.example.com/new.md' },
        ],
        toUpdate: [],
        unchanged: ['existing.md'],
        deleted: ['old.md'],
      }),
    });

    const result = await handleSyncSite(client, {
      siteId: 'site-1',
      manifest: [
        { path: 'new.md', sha: 'abc', size: 50 },
        { path: 'existing.md', sha: 'def', size: 100 },
      ],
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('1 file(s) to upload');
    expect(result.content[0].text).toContain('1 unchanged');
    expect(result.content[0].text).toContain('1 deleted');
    expect(client.syncSite).toHaveBeenCalledWith(
      'test-token',
      'site-1',
      expect.any(Array),
      false,
    );
  });

  test('supports dry run', async () => {
    tokenStore.setToken('test-token');

    const client = mockClient({
      syncSite: vi.fn().mockResolvedValue({
        toUpload: [],
        toUpdate: [],
        unchanged: ['file.md'],
        deleted: [],
      }),
    });

    const result = await handleSyncSite(client, {
      siteId: 'site-1',
      manifest: [{ path: 'file.md', sha: 'abc', size: 50 }],
      dryRun: true,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Dry run');
    expect(client.syncSite).toHaveBeenCalledWith(
      'test-token',
      'site-1',
      expect.any(Array),
      true,
    );
  });

  test('handles API error', async () => {
    tokenStore.setToken('test-token');

    const { ApiClientError } = await import('../../api-client');
    const client = mockClient({
      syncSite: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError(500, { error: 'Internal error' }),
        ),
    });

    const result = await handleSyncSite(client, {
      siteId: 'site-1',
      manifest: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('500');
  });
});

// ── delete_files ────────────────────────────────────────────

describe('handleDeleteFiles', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  test('returns not-authenticated when no token', async () => {
    const client = mockClient();
    const result = await handleDeleteFiles(client, {
      siteId: 'site-1',
      paths: ['old.md'],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Not authenticated');
  });

  test('deletes files and reports results', async () => {
    tokenStore.setToken('test-token');

    const client = mockClient({
      deleteFiles: vi.fn().mockResolvedValue({
        deleted: ['old.md', 'draft.md'],
        notFound: [],
      }),
    });

    const result = await handleDeleteFiles(client, {
      siteId: 'site-1',
      paths: ['old.md', 'draft.md'],
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Deleted 2 file(s)');
    expect(client.deleteFiles).toHaveBeenCalledWith('test-token', 'site-1', [
      'old.md',
      'draft.md',
    ]);
  });

  test('reports not-found files', async () => {
    tokenStore.setToken('test-token');

    const client = mockClient({
      deleteFiles: vi.fn().mockResolvedValue({
        deleted: ['exists.md'],
        notFound: ['ghost.md'],
      }),
    });

    const result = await handleDeleteFiles(client, {
      siteId: 'site-1',
      paths: ['exists.md', 'ghost.md'],
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Deleted 1 file(s)');
    expect(result.content[0].text).toContain('not found');
    expect(result.content[0].text).toContain('ghost.md');
  });

  test('handles site-not-found error', async () => {
    tokenStore.setToken('test-token');

    const { ApiClientError } = await import('../../api-client');
    const client = mockClient({
      deleteFiles: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError(404, { error: 'Site not found' }),
        ),
    });

    const result = await handleDeleteFiles(client, {
      siteId: 'bad-site',
      paths: ['file.md'],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
