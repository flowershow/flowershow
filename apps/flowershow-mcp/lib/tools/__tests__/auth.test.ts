import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleAuthStart,
  handleAuthStatus,
  handleAuthLogout,
} from '../auth';
import * as tokenStore from '../../token-store';
import type { FlowershowApiClient } from '../../api-client';

// ── Mock API client factory ─────────────────────────────────

function mockClient(overrides: Partial<FlowershowApiClient> = {}) {
  return {
    deviceAuthorize: vi.fn(),
    deviceToken: vi.fn(),
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

describe('auth tools', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    tokenStore.clearDeviceCode();
  });

  // ── auth_start ──────────────────────────────────────────

  describe('handleAuthStart', () => {
    it('initiates device auth and returns user code + verification URL', async () => {
      const client = mockClient({
        deviceAuthorize: vi.fn().mockResolvedValue({
          device_code: 'dev-abc',
          user_code: 'WXYZ-1234',
          verification_uri: 'https://app.flowershow.app/authorize',
          verification_uri_complete:
            'https://app.flowershow.app/authorize?code=WXYZ-1234',
          expires_in: 900,
          interval: 5,
        }),
      });

      const result = await handleAuthStart(client);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('WXYZ-1234');
      expect(text).toContain('https://app.flowershow.app/authorize');
      expect(tokenStore.getDeviceCode()).toBe('dev-abc');
    });

    it('returns existing token info if already authenticated', async () => {
      tokenStore.setToken('existing-token');
      const client = mockClient({
        getUser: vi.fn().mockResolvedValue({
          username: 'alice',
          email: 'alice@example.com',
        }),
      });

      const result = await handleAuthStart(client);

      expect(result.content[0].text).toContain('already authenticated');
      expect(result.content[0].text).toContain('alice');
    });
  });

  // ── auth_status ─────────────────────────────────────────

  describe('handleAuthStatus', () => {
    it('returns pending when device code exists but not yet authorized', async () => {
      tokenStore.setDeviceCode('dev-abc');
      const client = mockClient({
        deviceToken: vi.fn().mockResolvedValue({
          error: 'authorization_pending',
        }),
      });

      const result = await handleAuthStatus(client);

      expect(result.content[0].text).toContain('pending');
    });

    it('returns success and stores token when authorized', async () => {
      tokenStore.setDeviceCode('dev-abc');
      const client = mockClient({
        deviceToken: vi.fn().mockResolvedValue({
          access_token: 'fs_cli_new_token',
          token_type: 'bearer',
        }),
        getUser: vi.fn().mockResolvedValue({
          username: 'bob',
          email: 'bob@example.com',
        }),
      });

      const result = await handleAuthStatus(client);

      expect(result.content[0].text).toContain('bob');
      expect(tokenStore.getToken()).toBe('fs_cli_new_token');
      expect(tokenStore.getDeviceCode()).toBeNull();
    });

    it('returns already authenticated when token exists', async () => {
      tokenStore.setToken('existing-token');
      const client = mockClient({
        getUser: vi.fn().mockResolvedValue({
          username: 'alice',
        }),
      });

      const result = await handleAuthStatus(client);

      expect(result.content[0].text).toContain('Authenticated');
      expect(result.content[0].text).toContain('alice');
    });

    it('returns error when no device code and no token', async () => {
      const client = mockClient();

      const result = await handleAuthStatus(client);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('auth_start');
    });
  });

  // ── auth_logout ─────────────────────────────────────────

  describe('handleAuthLogout', () => {
    it('clears stored token', async () => {
      tokenStore.setToken('existing-token');

      const result = await handleAuthLogout();

      expect(tokenStore.getToken()).toBeNull();
      expect(result.content[0].text).toContain('logged out');
    });

    it('handles logout when not authenticated', async () => {
      const result = await handleAuthLogout();

      expect(result.content[0].text).toContain('not authenticated');
    });
  });
});
