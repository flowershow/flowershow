import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowershowApiClient } from '../api-client';
import type {
  DeleteFilesResponse,
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
      // API returns user object directly (bare)
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
      const sites: Site[] = [
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
      // API returns { sites: [...], total: N } (wrapped)
      const fetchMock = mockFetch({ sites, total: sites.length });
      global.fetch = fetchMock;

      const result = await client.listSites('token-123');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites`);
      expect(opts.headers.Authorization).toBe('Bearer token-123');
      expect(result).toEqual(sites);
    });

    it('throws on unexpected response shape', async () => {
      // If API returns something unexpected
      const fetchMock = mockFetch({ unexpected: true });
      global.fetch = fetchMock;

      await expect(client.listSites('token-123')).rejects.toThrow(
        'Unexpected response from /api/sites',
      );
    });
  });

  describe('createSite', () => {
    it('posts site creation request', async () => {
      const site: Site = {
        id: 'site-2',
        projectName: 'docs',
        url: 'https://alice.flowershow.app/docs',
        customDomain: null,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      };
      // API returns { site: {...} } (wrapped)
      const fetchMock = mockFetch({ site });
      global.fetch = fetchMock;

      const result = await client.createSite('token-123', {
        projectName: 'docs',
      });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ projectName: 'docs' });
      expect(result).toEqual(site);
    });

    it('throws on unexpected response shape', async () => {
      const fetchMock = mockFetch({ unexpected: true });
      global.fetch = fetchMock;

      await expect(
        client.createSite('token-123', { projectName: 'test' }),
      ).rejects.toThrow('Unexpected response from POST /api/sites');
    });
  });

  describe('getSite', () => {
    it('gets site by id', async () => {
      const site: Site = {
        id: 'site-1',
        projectName: 'blog',
        url: 'https://alice.flowershow.app/blog',
        customDomain: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      // API returns { site: {...} } (wrapped)
      const fetchMock = mockFetch({ site });
      global.fetch = fetchMock;

      const result = await client.getSite('token-123', 'site-1');

      expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/api/sites/id/site-1`);
      expect(result).toEqual(site);
    });

    it('throws on unexpected response shape', async () => {
      const fetchMock = mockFetch({ unexpected: true });
      global.fetch = fetchMock;

      await expect(client.getSite('token-123', 'site-1')).rejects.toThrow(
        'Unexpected response from GET /api/sites/id/site-1',
      );
    });
  });

  describe('deleteSite', () => {
    it('deletes site by id', async () => {
      // API returns { success: true, message: '...', deletedFiles: N }
      const fetchMock = mockFetch({
        success: true,
        message: 'Site deleted successfully',
        deletedFiles: 5,
      });
      global.fetch = fetchMock;

      await client.deleteSite('token-123', 'site-1');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites/id/site-1`);
      expect(opts.method).toBe('DELETE');
    });
  });

  // ── Files ───────────────────────────────────────────────

  describe('publishFiles', () => {
    it('posts file metadata and returns uploads/unchanged', async () => {
      // API returns { files: [...] } where files are those needing upload
      const apiResponse = {
        files: [
          {
            path: 'index.md',
            uploadUrl: 'https://r2.example.com/upload',
            blobId: 'b1',
            contentType: 'text/markdown',
          },
        ],
      };
      const fetchMock = mockFetch(apiResponse);
      global.fetch = fetchMock;

      const result = await client.publishFiles('token-123', 'site-1', [
        { path: 'index.md', sha: 'abc', size: 100 },
      ]);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites/id/site-1/files`);
      expect(opts.method).toBe('POST');
      // Client should transform API response into our internal format
      expect(result).toEqual({
        uploads: [
          { path: 'index.md', uploadUrl: 'https://r2.example.com/upload' },
        ],
        unchanged: [],
      });
    });

    it('correctly identifies unchanged files', async () => {
      // API only returns files that need uploading
      // Files not in the response are unchanged
      const apiResponse = {
        files: [
          {
            path: 'new.md',
            uploadUrl: 'https://r2.example.com/u1',
            blobId: 'b1',
            contentType: 'text/markdown',
          },
        ],
      };
      const fetchMock = mockFetch(apiResponse);
      global.fetch = fetchMock;

      const result = await client.publishFiles('token-123', 'site-1', [
        { path: 'new.md', sha: 'sha1', size: 50 },
        { path: 'existing.md', sha: 'sha2', size: 80 },
      ]);

      expect(result).toEqual({
        uploads: [{ path: 'new.md', uploadUrl: 'https://r2.example.com/u1' }],
        unchanged: ['existing.md'],
      });
    });
  });

  describe('deleteFiles', () => {
    it('deletes files by path', async () => {
      const expected: DeleteFilesResponse = {
        deleted: ['old.md'],
        notFound: [],
      };
      // API returns { deleted: [...], notFound: [...] } (bare)
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
      // API returns { toUpload, toUpdate, deleted, unchanged, summary, dryRun? }
      const apiResponse = {
        toUpload: [
          {
            path: 'new.md',
            uploadUrl: 'https://r2.example.com/u1',
            blobId: 'b1',
            contentType: 'text/markdown',
          },
        ],
        toUpdate: [],
        unchanged: ['existing.md'],
        deleted: ['removed.md'],
        summary: { toUpload: 1, toUpdate: 0, deleted: 1, unchanged: 1 },
      };
      const expected: SyncResponse = {
        toUpload: [{ path: 'new.md', uploadUrl: 'https://r2.example.com/u1' }],
        toUpdate: [],
        unchanged: ['existing.md'],
        deleted: ['removed.md'],
      };
      const fetchMock = mockFetch(apiResponse);
      global.fetch = fetchMock;

      const result = await client.syncSite('token-123', 'site-1', [
        { path: 'new.md', sha: 'sha1', size: 50 },
        { path: 'existing.md', sha: 'sha2', size: 80 },
      ]);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/api/sites/id/site-1/sync`);
      expect(opts.method).toBe('POST');
      // The extra summary/blobId/contentType fields are ignored
      expect(result.toUpload).toHaveLength(1);
      expect(result.toUpload[0].path).toBe('new.md');
      expect(result.unchanged).toEqual(['existing.md']);
      expect(result.deleted).toEqual(['removed.md']);
    });
  });

  // ── Status ──────────────────────────────────────────────

  describe('getSiteStatus', () => {
    it('gets site processing status', async () => {
      // API returns { siteId, status, files: { total, pending, success, failed }, blobs: [...] }
      const apiResponse = {
        siteId: 'site-1',
        status: 'complete' as const,
        files: {
          total: 10,
          pending: 0,
          success: 10,
          failed: 0,
        },
        blobs: [],
      };
      const expected: SiteStatus = {
        status: 'complete',
        pending: 0,
        success: 10,
        error: 0,
        total: 10,
      };
      const fetchMock = mockFetch(apiResponse);
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
