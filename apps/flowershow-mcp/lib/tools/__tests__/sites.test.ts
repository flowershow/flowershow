import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowershowApiClient } from '../../api-client';
import { ApiClientError } from '../../api-client';
import * as tokenStore from '../../token-store';
import {
  handleCreateSite,
  handleDeleteSite,
  handleGetSite,
  handleGetSiteStatus,
  handleGetUser,
  handleListSites,
} from '../sites';

function mockClient(overrides: Partial<FlowershowApiClient> = {}) {
  return {
    getUser: vi.fn(),
    listSites: vi.fn(),
    createSite: vi.fn(),
    getSite: vi.fn(),
    deleteSite: vi.fn(),
    publishFiles: vi.fn(),
    deleteFiles: vi.fn(),
    syncSite: vi.fn(),
    getSiteStatus: vi.fn(),
    uploadToPresignedUrl: vi.fn(),
    ...overrides,
  } as unknown as FlowershowApiClient;
}

describe('site tools', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  // ── requireAuth ─────────────────────────────────────────

  describe('auth guard', () => {
    it('returns auth error when no token is set', async () => {
      const client = mockClient();
      const result = await handleGetUser(client);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not authenticated');
    });
  });

  // ── get_user ────────────────────────────────────────────

  describe('handleGetUser', () => {
    it('returns user info', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        getUser: vi.fn().mockResolvedValue({
          id: 'u1',
          username: 'alice',
          email: 'alice@example.com',
          name: 'Alice',
          image: null,
          role: 'user',
        }),
      });

      const result = await handleGetUser(client);

      expect(result.isError).toBeUndefined();
      const text = result.content[0].text;
      expect(text).toContain('alice');
      expect(text).toContain('alice@example.com');
    });
  });

  // ── list_sites ──────────────────────────────────────────

  describe('handleListSites', () => {
    it('lists user sites', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        listSites: vi.fn().mockResolvedValue([
          {
            id: 's1',
            projectName: 'blog',
            url: 'https://alice.flowershow.app/blog',
            fileCount: 10,
          },
          {
            id: 's2',
            projectName: 'docs',
            url: 'https://alice.flowershow.app/docs',
            fileCount: 5,
          },
        ]),
      });

      const result = await handleListSites(client);

      const text = result.content[0].text;
      expect(text).toContain('blog');
      expect(text).toContain('docs');
      expect(text).toContain('2 site');
    });

    it('handles empty site list', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        listSites: vi.fn().mockResolvedValue([]),
      });

      const result = await handleListSites(client);

      expect(result.content[0].text).toContain('no sites');
    });
  });

  // ── create_site ─────────────────────────────────────────

  describe('handleCreateSite', () => {
    it('creates a site and returns info', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        createSite: vi.fn().mockResolvedValue({
          id: 's-new',
          projectName: 'my-project',
          url: 'https://alice.flowershow.app/my-project',
        }),
      });

      const result = await handleCreateSite(client, {
        projectName: 'my-project',
      });

      expect(result.content[0].text).toContain('my-project');
      expect(result.content[0].text).toContain(
        'https://alice.flowershow.app/my-project',
      );
    });

    it('handles conflict error', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        createSite: vi
          .fn()
          .mockRejectedValue(
            new ApiClientError(409, { error: 'Site already exists' }),
          ),
      });

      const result = await handleCreateSite(client, {
        projectName: 'existing',
      });

      expect(result.isError).toBe(true);
    });
  });

  // ── get_site ────────────────────────────────────────────

  describe('handleGetSite', () => {
    it('returns site details', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        getSite: vi.fn().mockResolvedValue({
          id: 's1',
          projectName: 'blog',
          url: 'https://alice.flowershow.app/blog',
          customDomain: 'blog.alice.dev',
          fileCount: 42,
          totalSize: 1048576,
        }),
      });

      const result = await handleGetSite(client, { siteId: 's1' });

      const text = result.content[0].text;
      expect(text).toContain('blog');
      expect(text).toContain('blog.alice.dev');
    });
  });

  // ── delete_site ─────────────────────────────────────────

  describe('handleDeleteSite', () => {
    it('deletes a site', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        deleteSite: vi.fn().mockResolvedValue(undefined),
      });

      const result = await handleDeleteSite(client, { siteId: 's1' });

      expect(result.content[0].text).toContain('deleted');
    });

    it('handles not found', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        deleteSite: vi
          .fn()
          .mockRejectedValue(new ApiClientError(404, { error: 'Not found' })),
      });

      const result = await handleDeleteSite(client, {
        siteId: 'nonexistent',
      });

      expect(result.isError).toBe(true);
    });
  });

  // ── get_site_status ─────────────────────────────────────

  describe('handleGetSiteStatus', () => {
    it('returns site status', async () => {
      tokenStore.setToken('tok');
      const client = mockClient({
        getSiteStatus: vi.fn().mockResolvedValue({
          status: 'complete',
          pending: 0,
          success: 10,
          error: 0,
          total: 10,
        }),
      });

      const result = await handleGetSiteStatus(client, { siteId: 's1' });

      const text = result.content[0].text;
      expect(text).toContain('complete');
      expect(text).toContain('10');
    });
  });
});
