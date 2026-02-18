import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowershowApiClient } from '../api-client';
import type {
  DeleteFilesResponse,
  PublishFilesResponse,
  Site,
  SiteStatus,
  SyncResponse,
  User,
} from '../types';

// ── Helpers ─────────────────────────────────────────────────

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
}

describe('FlowershowApiClient', () => {
  const baseUrl = 'https://api.flowershow.app';
  let client: FlowershowApiClient;

  beforeEach(() => {
    client = new FlowershowApiClient(baseUrl);
    vi.restoreAllMocks();
  });

  // ── User ────────────────────────────────────────────────

  describe('getUser', () => {
    it('gets user with bearer token', async () => {
      const expected: User = {
        id: 'user-1',
        name: 'Alice',
        username: 'alice',
        email: 'alice@example.com',
        image: null,
        role: 'user',
      };
      const fetchMock = mockFetch(expected);
      global.fetch = fetchMock;

      const result = await client.getUser('token-123');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/user`);
      expect(opts.headers.Authorization).toBe('Bearer token-123');
      expect(result).toEqual(expected);
    });
  });

  // ── Sites ───────────────────────────────────────────────

  describe('listSites', () => {
    it('gets sites list with auth', async () => {
      const expected: Site[] = [
        {
          id: 'site-1',
          projectName: 'blog',
          url: 'https://alice.flowershow.app/blog',
          customDomain: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          fileCount: 10,
        },
      ];
      const fetchMock = mockFetch(expected);
      global.fetch = fetchMock;

      const result = await client.listSites('token-123');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites`);
      expect(opts.headers.Authorization).toBe('Bearer token-123');
      expect(result).toEqual(expected);
    });
  });

  describe('createSite', () => {
    it('posts site creation request', async () => {
      const expected: Site = {
        id: 'site-2',
        projectName: 'docs',
        url: 'https://alice.flowershow.app/docs',
        customDomain: null,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      };
      const fetchMock = mockFetch(expected);
      global.fetch = fetchMock;

      const result = await client.createSite('token-123', {
        projectName: 'docs',
      });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ projectName: 'docs' });
      expect(result).toEqual(expected);
    });
  });

  describe('getSite', () => {
    it('gets site by id', async () => {
      const expected: Site = {
        id: 'site-1',
        projectName: 'blog',
        url: 'https://alice.flowershow.app/blog',
        customDomain: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const fetchMock = mockFetch(expected);
      global.fetch = fetchMock;

      const result = await client.getSite('token-123', 'site-1');

      expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/api/sites/id/site-1`);
      expect(result).toEqual(expected);
    });
  });

  describe('deleteSite', () => {
    it('deletes site by id', async () => {
      const fetchMock = mockFetch({ success: true });
      global.fetch = fetchMock;

      await client.deleteSite('token-123', 'site-1');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites/id/site-1`);
      expect(opts.method).toBe('DELETE');
    });
  });

  // ── Files ───────────────────────────────────────────────

  describe('publishFiles', () => {
    it('posts file metadata for upload URLs', async () => {
      const expected: PublishFilesResponse = {
        uploads: [
          { path: 'index.md', uploadUrl: 'https://r2.example.com/upload' },
        ],
        unchanged: [],
      };
      const fetchMock = mockFetch(expected);
      global.fetch = fetchMock;

      const result = await client.publishFiles('token-123', 'site-1', [
        { path: 'index.md', sha: 'abc', size: 100 },
      ]);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites/id/site-1/files`);
      expect(opts.method).toBe('POST');
      expect(result).toEqual(expected);
    });
  });

  describe('deleteFiles', () => {
    it('deletes files by path', async () => {
      const expected: DeleteFilesResponse = {
        deleted: ['old.md'],
        notFound: [],
      };
      const fetchMock = mockFetch(expected);
      global.fetch = fetchMock;

      const result = await client.deleteFiles('token-123', 'site-1', [
        'old.md',
      ]);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites/id/site-1/files`);
      expect(opts.method).toBe('DELETE');
      expect(result).toEqual(expected);
    });
  });

  // ── Sync ────────────────────────────────────────────────

  describe('syncSite', () => {
    it('posts manifest for sync diff', async () => {
      const expected: SyncResponse = {
        toUpload: [{ path: 'new.md', uploadUrl: 'https://r2.example.com/u1' }],
        toUpdate: [],
        unchanged: ['existing.md'],
        deleted: ['removed.md'],
      };
      const fetchMock = mockFetch(expected);
      global.fetch = fetchMock;

      const result = await client.syncSite('token-123', 'site-1', [
        { path: 'new.md', sha: 'sha1', size: 50 },
        { path: 'existing.md', sha: 'sha2', size: 80 },
      ]);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites/id/site-1/sync`);
      expect(opts.method).toBe('POST');
      expect(result).toEqual(expected);
    });
  });

  // ── Status ──────────────────────────────────────────────

  describe('getSiteStatus', () => {
    it('gets site processing status', async () => {
      const expected: SiteStatus = {
        status: 'complete',
        pending: 0,
        success: 10,
        error: 0,
        total: 10,
      };
      const fetchMock = mockFetch(expected);
      global.fetch = fetchMock;

      const result = await client.getSiteStatus('token-123', 'site-1');

      expect(fetchMock.mock.calls[0][0]).toBe(
        `${baseUrl}/api/sites/id/site-1/status`,
      );
      expect(result).toEqual(expected);
    });
  });

  // ── Error handling ──────────────────────────────────────

  describe('error handling', () => {
    it('throws ApiClientError on non-ok response for authenticated endpoints', async () => {
      const fetchMock = mockFetch({ error: 'Unauthorized' }, 401);
      global.fetch = fetchMock;

      await expect(client.getUser('bad-token')).rejects.toThrow(
        'Flowershow API error',
      );
    });

    it('throws on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

      await expect(client.getUser('token-123')).rejects.toThrow('fetch failed');
    });
  });
});
