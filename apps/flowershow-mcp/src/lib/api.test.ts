import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListSitesResponse } from './api.js';
import { ApiError, FlowershowApi } from './api.js';

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('stores status, statusText, and body', () => {
    const err = new ApiError(403, 'Forbidden', '{"error":"nope"}');

    expect(err.status).toBe(403);
    expect(err.statusText).toBe('Forbidden');
    expect(err.body).toBe('{"error":"nope"}');
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Flowershow API error 403: Forbidden');
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// FlowershowApi
// ---------------------------------------------------------------------------

describe('FlowershowApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -- constructor ----------------------------------------------------------

  describe('constructor', () => {
    it('strips trailing slashes from baseUrl', async () => {
      const api = new FlowershowApi({
        baseUrl: 'https://example.com///',
        pat: 'tok',
      });

      const mockResponse = {
        ok: true,
        json: async () => ({ sites: [], total: 0 }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse as unknown as Response,
      );

      await api.listSites();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api/sites',
        expect.any(Object),
      );
    });
  });

  // -- listSites ------------------------------------------------------------

  describe('listSites', () => {
    it('calls GET /api/sites with correct auth header', async () => {
      const payload: ListSitesResponse = {
        sites: [
          {
            id: 's1',
            projectName: 'my-site',
            url: 'https://my-site.flowershow.app',
            fileCount: 42,
            updatedAt: '2025-01-01T00:00:00Z',
            createdAt: '2024-06-01T00:00:00Z',
          },
        ],
        total: 1,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => payload,
      } as unknown as Response);

      const api = new FlowershowApi({
        baseUrl: 'https://api.example.com',
        pat: 'fs_pat_abc123',
      });

      const result = await api.listSites();

      expect(result).toEqual(payload);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/sites',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer fs_pat_abc123',
            Accept: 'application/json',
          },
        },
      );
    });

    it('throws ApiError on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"error":"invalid token"}',
      } as unknown as Response);

      const api = new FlowershowApi({
        baseUrl: 'https://api.example.com',
        pat: 'bad_token',
      });

      await expect(api.listSites()).rejects.toThrow(ApiError);
      await expect(api.listSites()).rejects.toMatchObject({
        status: 401,
        statusText: 'Unauthorized',
        body: '{"error":"invalid token"}',
      });
    });

    it('throws ApiError on 500 server error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Something went wrong',
      } as unknown as Response);

      const api = new FlowershowApi({
        baseUrl: 'https://api.example.com',
        pat: 'fs_pat_abc',
      });

      await expect(api.listSites()).rejects.toThrow(
        'Flowershow API error 500: Internal Server Error',
      );
    });
  });
});
