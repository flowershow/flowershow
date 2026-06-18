import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks (must be declared before vi.mock factories) ─────

const mocks = vi.hoisted(() => ({
  validateAccessToken: vi.fn(),
  getClientInfo: vi.fn(),
  isLegacyPublishClient: vi.fn(),
  generatePresignedUploadUrl: vi.fn(),
  prisma: {
    site: { findUnique: vi.fn() },
    blob: { findMany: vi.fn() },
    publish: { create: vi.fn() },
    publishFile: { create: vi.fn() },
  },
}));

// ── Module mocks ──────────────────────────────────────────────────

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'test',
    NEXT_PUBLIC_ROOT_DOMAIN: 'localhost:3000',
    NEXT_PUBLIC_S3_BUCKET_DOMAIN: 's3.example.com',
  },
}));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/server/auth', () => ({ authOptions: {} }));

vi.mock('@/server/db', () => ({ default: mocks.prisma }));

vi.mock('@/lib/cli-auth', () => ({
  validateAccessToken: mocks.validateAccessToken,
  getClientInfo: mocks.getClientInfo,
  isLegacyPublishClient: mocks.isLegacyPublishClient,
}));

vi.mock('@/lib/content-store', () => ({
  generatePresignedUploadUrl: mocks.generatePresignedUploadUrl,
  getContentType: (ext: string) => `text/${ext}`,
}));

vi.mock('@/lib/blob-cleanup', () => ({
  deleteBlobs: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/typesense', () => ({ ensureSiteCollection: vi.fn() }));
vi.mock('@/lib/server-posthog', () => {
  const client = {
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  return { default: () => client };
});

// ── Import after mocks ─────────────────────────────────────────────

import { POST } from '../route';

// ── Helpers ────────────────────────────────────────────────────────

function makeRequest(
  body: unknown,
  clientType: 'cli' | 'obsidian-plugin' | 'unknown' = 'cli',
) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (clientType === 'cli') headers['x-flowershow-cli-version'] = '1.0.0';
  if (clientType === 'obsidian-plugin')
    headers['x-flowershow-plugin-version'] = '1.0.0';
  return new NextRequest('http://localhost/api/sites/id/site-1/files', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const SITE = { id: 'site-1', userId: 'user-1' };
const PUBLISH = { id: 'publish-xyz', siteId: 'site-1', source: 'cli' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.validateAccessToken.mockResolvedValue({ userId: 'user-1' });
  mocks.getClientInfo.mockReturnValue({
    client_type: 'cli',
    client_version: '1.0.0',
  });
  mocks.isLegacyPublishClient.mockReturnValue(false);
  mocks.prisma.site.findUnique.mockResolvedValue(SITE);
  mocks.prisma.blob.findMany.mockResolvedValue([]);
  mocks.prisma.publish.create.mockResolvedValue(PUBLISH);
  mocks.prisma.publishFile.create.mockResolvedValue({ id: 'pf-1' });
  mocks.generatePresignedUploadUrl.mockResolvedValue(
    'https://s3.example.com/upload-url',
  );
});

// ── Tests ──────────────────────────────────────────────────────────

describe('POST /api/sites/id/:siteId/files', () => {
  describe('Publish record creation', () => {
    it('creates a Publish record with cli source', async () => {
      const req = makeRequest(
        { files: [{ path: 'a.md', size: 100, sha: 'sha1' }] },
        'cli',
      );

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(200);
      expect(mocks.prisma.publish.create).toHaveBeenCalledWith({
        data: { siteId: 'site-1', source: 'cli', legacy: false },
      });
    });

    it('creates a Publish record with obsidian_plugin source', async () => {
      mocks.getClientInfo.mockReturnValue({
        client_type: 'obsidian-plugin',
        client_version: '1.0.0',
      });
      const req = makeRequest(
        { files: [{ path: 'a.md', size: 100, sha: 'sha1' }] },
        'obsidian-plugin',
      );

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publish.create).toHaveBeenCalledWith({
        data: { siteId: 'site-1', source: 'obsidian_plugin', legacy: false },
      });
    });

    it('creates a Publish record with dashboard_upload source for unknown client', async () => {
      mocks.getClientInfo.mockReturnValue({
        client_type: 'unknown',
        client_version: null,
      });
      const req = makeRequest(
        { files: [{ path: 'a.md', size: 100, sha: 'sha1' }] },
        'unknown',
      );

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publish.create).toHaveBeenCalledWith({
        data: { siteId: 'site-1', source: 'dashboard_upload', legacy: false },
      });
    });

    it('creates a legacy Publish record and skips PublishFile rows for legacy clients', async () => {
      mocks.isLegacyPublishClient.mockReturnValue(true);
      const req = makeRequest({
        files: [{ path: 'a.md', size: 100, sha: 'sha1' }],
      });

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(200);
      expect(mocks.prisma.publish.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ legacy: true }),
      });
      expect(mocks.prisma.publishFile.create).not.toHaveBeenCalled();
    });
  });

  describe('PublishFile rows', () => {
    it('creates PublishFile with changeType=added for new files (no existing blob)', async () => {
      mocks.prisma.blob.findMany.mockResolvedValue([]);
      const req = makeRequest({
        files: [{ path: 'new.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publishFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            path: 'new.md',
            changeType: 'added',
            status: 'uploading',
          }),
        }),
      );
    });

    it('creates PublishFile with changeType=added for files with different sha (treated as re-add)', async () => {
      mocks.prisma.blob.findMany.mockResolvedValue([
        { path: 'existing.md', sha: 'old-sha' },
      ]);
      const req = makeRequest({
        files: [{ path: 'existing.md', size: 100, sha: 'new-sha' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publishFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            path: 'existing.md',
            changeType: 'added',
            status: 'uploading',
          }),
        }),
      );
    });

    it('creates PublishFile with changeType=updated for files with same sha (re-upload)', async () => {
      mocks.prisma.blob.findMany.mockResolvedValue([
        { path: 'same.md', sha: 'sha1' },
      ]);
      const req = makeRequest({
        files: [{ path: 'same.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publishFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            path: 'same.md',
            changeType: 'updated',
            status: 'uploading',
          }),
        }),
      );
    });

    it('sets presignedUrlExpiresAt on PublishFile rows', async () => {
      const before = new Date();
      const req = makeRequest({
        files: [{ path: 'a.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      const call = mocks.prisma.publishFile.create.mock.calls[0][0];
      expect(call.data.presignedUrlExpiresAt).toBeInstanceOf(Date);
      expect(call.data.presignedUrlExpiresAt.getTime()).toBeGreaterThan(
        before.getTime() + 3500 * 1000,
      );
    });

    it('links PublishFile to the created Publish record', async () => {
      const req = makeRequest({
        files: [{ path: 'a.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publishFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ publishId: 'publish-xyz' }),
        }),
      );
    });
  });

  describe('Response shape', () => {
    it('includes publishId in the response', async () => {
      const req = makeRequest({
        files: [{ path: 'a.md', size: 100, sha: 'sha1' }],
      });

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });
      const body = await res.json();

      expect(body.publishId).toBe('publish-xyz');
      expect(body.files).toHaveLength(1);
    });

    it('passes publishId as R2 object metadata for presigned URL generation', async () => {
      const req = makeRequest({
        files: [{ path: 'docs/page.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.generatePresignedUploadUrl).toHaveBeenCalledWith(
        'site-1/main/raw/docs/page.md',
        3600,
        expect.any(String),
        { 'publish-id': 'publish-xyz' },
        expect.any(Set),
      );
    });

    it('omits publish-id metadata for legacy clients', async () => {
      mocks.isLegacyPublishClient.mockReturnValue(true);
      const req = makeRequest({
        files: [{ path: 'docs/page.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.generatePresignedUploadUrl).toHaveBeenCalledWith(
        'site-1/main/raw/docs/page.md',
        3600,
        expect.any(String),
        undefined,
        undefined,
      );
    });
  });

  describe('Auth & validation', () => {
    it('returns 401 when token is invalid', async () => {
      mocks.validateAccessToken.mockResolvedValue(null);
      const req = makeRequest({
        files: [{ path: 'a.md', size: 100, sha: 'sha1' }],
      });

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 when user does not own the site', async () => {
      mocks.prisma.site.findUnique.mockResolvedValue({
        id: 'site-1',
        userId: 'other-user',
      });
      const req = makeRequest({
        files: [{ path: 'a.md', size: 100, sha: 'sha1' }],
      });

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(403);
    });

    it('returns 400 when body is invalid', async () => {
      const req = makeRequest({ notFiles: [] });

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(400);
      expect(mocks.prisma.publish.create).not.toHaveBeenCalled();
    });
  });
});
