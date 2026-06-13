import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks (must be declared before vi.mock factories) ─────

const mocks = vi.hoisted(() => ({
  validateAccessToken: vi.fn(),
  checkCliVersion: vi.fn(),
  getClientInfo: vi.fn(),
  isLegacyPublishClient: vi.fn(),
  generatePresignedUploadUrl: vi.fn(),
  deleteBlobs: vi.fn(),
  prisma: {
    site: { findUnique: vi.fn() },
    blob: { findMany: vi.fn(), upsert: vi.fn() },
    publish: { create: vi.fn(), findMany: vi.fn() },
    publishFile: { createMany: vi.fn() },
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

vi.mock('@/server/db', () => ({ default: mocks.prisma }));

vi.mock('@/lib/cli-auth', () => ({
  validateAccessToken: mocks.validateAccessToken,
  checkCliVersion: mocks.checkCliVersion,
  getClientInfo: mocks.getClientInfo,
  isLegacyPublishClient: mocks.isLegacyPublishClient,
}));

vi.mock('@/lib/content-store', () => ({
  generatePresignedUploadUrl: mocks.generatePresignedUploadUrl,
  getContentType: (ext: string) => `text/${ext}`,
}));

vi.mock('@/lib/blob-cleanup', () => ({ deleteBlobs: mocks.deleteBlobs }));
vi.mock('@/lib/otel-logger', () => ({
  log: vi.fn(),
  SeverityNumber: { INFO: 9 },
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
vi.mock('@/lib/resolve-link', () => ({
  resolveFilePathToUrlPath: ({ target }: { target: string }) => `/${target}`,
}));
vi.mock('@/lib/publish-workflow', () => ({ startPublishWorkflow: vi.fn() }));

// ── Import after mocks ─────────────────────────────────────────────

import { POST } from '../route';

// ── Helpers ────────────────────────────────────────────────────────

function makeRequest(
  body: unknown,
  opts: { dryRun?: boolean; clientType?: 'cli' | 'obsidian-plugin' } = {},
) {
  const url = `http://localhost/api/sites/id/site-1/sync${opts.dryRun ? '?dryRun=true' : ''}`;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (opts.clientType === 'cli') headers['x-flowershow-cli-version'] = '1.0.0';
  if (opts.clientType === 'obsidian-plugin')
    headers['x-flowershow-plugin-version'] = '1.0.0';
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const SITE = { id: 'site-1', userId: 'user-1' };
const PUBLISH = { id: 'publish-abc', siteId: 'site-1', source: 'cli' };
const BLOB_UPSERT = { id: 'blob-1', path: 'file.md' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkCliVersion.mockReturnValue(null);
  mocks.validateAccessToken.mockResolvedValue({ userId: 'user-1' });
  mocks.getClientInfo.mockReturnValue({
    client_type: 'cli',
    client_version: '1.0.0',
  });
  mocks.isLegacyPublishClient.mockReturnValue(false);
  mocks.prisma.site.findUnique.mockResolvedValue(SITE);
  mocks.prisma.blob.findMany.mockResolvedValue([]);
  mocks.prisma.blob.upsert.mockResolvedValue(BLOB_UPSERT);
  mocks.prisma.publish.create.mockResolvedValue(PUBLISH);
  mocks.prisma.publish.findMany.mockResolvedValue([]);
  mocks.prisma.publishFile.createMany.mockResolvedValue({ count: 0 });
  mocks.generatePresignedUploadUrl.mockResolvedValue(
    'https://s3.example.com/upload-url',
  );
  mocks.deleteBlobs.mockResolvedValue([]);
});

// ── Tests ──────────────────────────────────────────────────────────

describe('POST /api/sites/id/:siteId/sync', () => {
  describe('Publish record creation', () => {
    it('creates a Publish record with cli source when CLI header is present', async () => {
      mocks.getClientInfo.mockReturnValue({
        client_type: 'cli',
        client_version: '1.0.0',
      });
      const req = makeRequest(
        { files: [{ path: 'a.md', size: 100, sha: 'sha1' }] },
        { clientType: 'cli' },
      );

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(200);
      expect(mocks.prisma.publish.create).toHaveBeenCalledWith({
        data: { siteId: 'site-1', source: 'cli', legacy: false },
      });
    });

    it('creates a Publish record with obsidian_plugin source for plugin header', async () => {
      mocks.getClientInfo.mockReturnValue({
        client_type: 'obsidian-plugin',
        client_version: '1.0.0',
      });
      const req = makeRequest(
        { files: [{ path: 'a.md', size: 100, sha: 'sha1' }] },
        { clientType: 'obsidian-plugin' },
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
      const req = makeRequest({
        files: [{ path: 'a.md', size: 100, sha: 'sha1' }],
      });

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
      expect(mocks.prisma.publishFile.createMany).not.toHaveBeenCalled();
    });

    it('does NOT create a Publish record in dry-run mode', async () => {
      const req = makeRequest(
        { files: [{ path: 'a.md', size: 100, sha: 'sha1' }] },
        { dryRun: true },
      );

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(200);
      expect(mocks.prisma.publish.create).not.toHaveBeenCalled();
      expect(mocks.prisma.publishFile.createMany).not.toHaveBeenCalled();
    });
  });

  describe('PublishFile rows', () => {
    it('creates PublishFile rows with changeType=added for new files', async () => {
      mocks.prisma.blob.findMany.mockResolvedValue([]); // no existing blobs
      const req = makeRequest({
        files: [{ path: 'new.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publishFile.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              path: 'new.md',
              changeType: 'added',
              status: 'uploading',
            }),
          ]),
        }),
      );
    });

    it('creates PublishFile rows with changeType=updated for files with different sha', async () => {
      mocks.prisma.blob.findMany.mockResolvedValue([
        { id: 'blob-1', path: 'existing.md', sha: 'old-sha' },
      ]);
      const req = makeRequest({
        files: [{ path: 'existing.md', size: 100, sha: 'new-sha' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publishFile.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              path: 'existing.md',
              changeType: 'updated',
              status: 'uploading',
            }),
          ]),
        }),
      );
    });

    it('creates PublishFile rows with changeType=deleted and status=success for deleted files', async () => {
      mocks.prisma.blob.findMany.mockResolvedValue([
        { id: 'blob-1', path: 'to-delete.md', sha: 'sha1' },
      ]);
      mocks.deleteBlobs.mockResolvedValue(['to-delete.md']); // successfully deleted
      const req = makeRequest({ files: [] }); // no local files → delete existing

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publishFile.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              path: 'to-delete.md',
              changeType: 'deleted',
              status: 'success',
            }),
          ]),
        }),
      );
    });

    it('sets status=error on deleted PublishFile when R2 deletion fails', async () => {
      mocks.prisma.blob.findMany.mockResolvedValue([
        { id: 'blob-1', path: 'to-delete.md', sha: 'sha1' },
      ]);
      mocks.deleteBlobs.mockResolvedValue([]); // R2 deletion failed
      const req = makeRequest({ files: [] });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.prisma.publishFile.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              path: 'to-delete.md',
              changeType: 'deleted',
              status: 'error',
            }),
          ]),
        }),
      );
    });

    it('sets presignedUrlExpiresAt on added/updated PublishFile rows', async () => {
      const before = new Date();
      const req = makeRequest({
        files: [{ path: 'new.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      const call = mocks.prisma.publishFile.createMany.mock.calls[0][0];
      const row = call.data[0];
      expect(row.presignedUrlExpiresAt).toBeInstanceOf(Date);
      expect(row.presignedUrlExpiresAt.getTime()).toBeGreaterThan(
        before.getTime() + 3500 * 1000,
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

      expect(body.publishId).toBe('publish-abc');
    });

    it('does not include publishId in dry-run response', async () => {
      const req = makeRequest(
        { files: [{ path: 'a.md', size: 100, sha: 'sha1' }] },
        { dryRun: true },
      );

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });
      const body = await res.json();

      expect(body.publishId).toBeUndefined();
      expect(body.dryRun).toBe(true);
    });

    it('passes publishId as R2 object metadata', async () => {
      const req = makeRequest({
        files: [{ path: 'docs/a.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.generatePresignedUploadUrl).toHaveBeenCalledWith(
        'site-1/main/raw/docs/a.md',
        3600,
        expect.any(String),
        { 'publish-id': 'publish-abc' },
        new Set(['x-amz-meta-publish-id']),
      );
    });

    it('omits publish-id metadata for legacy clients', async () => {
      mocks.isLegacyPublishClient.mockReturnValue(true);
      const req = makeRequest({
        files: [{ path: 'docs/a.md', size: 100, sha: 'sha1' }],
      });

      await POST(req, { params: Promise.resolve({ siteId: 'site-1' }) });

      expect(mocks.generatePresignedUploadUrl).toHaveBeenCalledWith(
        'site-1/main/raw/docs/a.md',
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
      const req = makeRequest({ files: [] });

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
      const req = makeRequest({ files: [] });

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(403);
    });

    it('returns 404 when site does not exist', async () => {
      mocks.prisma.site.findUnique.mockResolvedValue(null);
      const req = makeRequest({ files: [] });

      const res = await POST(req, {
        params: Promise.resolve({ siteId: 'site-1' }),
      });

      expect(res.status).toBe(404);
    });
  });
});
