import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  validateAccessToken: vi.fn().mockResolvedValue({ userId: 'user-1' }),
}));

vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn() },
    blob: { findMany: vi.fn() },
    publish: { create: vi.fn(), findMany: vi.fn() },
    publishFile: { updateMany: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock('@/lib/content-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/content-store')>()),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  generatePresignedUploadUrl: vi
    .fn()
    .mockResolvedValue('https://s3.example.com/presigned'),
}));

vi.mock('@/lib/cloudflare-worker', () => ({
  startPublishFinalizerWorkflow: vi.fn().mockResolvedValue(undefined),
  terminatePublishFinalizerWorkflows: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/otel-logger', () => ({
  log: vi.fn(),
  flushLogs: vi.fn().mockResolvedValue(undefined),
  SeverityNumber: { ERROR: 17 },
}));

import { validateAccessToken } from '@/lib/cli-auth';
import { startPublishFinalizerWorkflow } from '@/lib/cloudflare-worker';
import { deleteFile, generatePresignedUploadUrl } from '@/lib/content-store';
import prisma from '@/server/db';
import { POST } from './route';

const SITE_ID = 'site-1';
const USER_ID = 'user-1';
const PUBLISH_ID = 'publish-1';

function makeRequest(
  body: unknown,
  opts: { searchParams?: string; headers?: Record<string, string> } = {},
): NextRequest {
  const url = `http://localhost/api/sites/id/${SITE_ID}/sync${
    opts.searchParams ? `?${opts.searchParams}` : ''
  }`;
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fs_cli_test',
      'X-Flowershow-CLI-Version': '2.1.0',
      ...opts.headers,
    },
  });
}

function makeParams(siteId: string) {
  return { params: Promise.resolve({ siteId }) };
}

const ownedSite = { id: SITE_ID, userId: USER_ID };

describe('POST /api/sites/id/[siteId]/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.site.findUnique).mockResolvedValue(ownedSite as any);
    vi.mocked(prisma.blob.findMany).mockResolvedValue([]);
    vi.mocked(prisma.publish.create).mockResolvedValue({
      id: PUBLISH_ID,
    } as any);
    vi.mocked(prisma.publish.findMany).mockResolvedValue([]);
    vi.mocked(prisma.publishFile.updateMany).mockResolvedValue({
      count: 0,
    } as any);
    vi.mocked(prisma.publishFile.createMany).mockResolvedValue({
      count: 0,
    } as any);
  });

  describe('authentication', () => {
    it('returns 401 when token is invalid', async () => {
      vi.mocked(validateAccessToken).mockResolvedValueOnce(null);

      const res = await POST(makeRequest({ files: [] }), makeParams(SITE_ID));

      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe('unauthorized');
    });

    it('returns 426 when CLI version is outdated', async () => {
      const res = await POST(
        makeRequest(
          { files: [] },
          { headers: { 'X-Flowershow-CLI-Version': '0.9.0' } },
        ),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(426);
    });
  });

  describe('site access', () => {
    it('returns 404 when site does not exist', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValueOnce(null);

      const res = await POST(makeRequest({ files: [] }), makeParams(SITE_ID));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe('not_found');
    });

    it('returns 403 when site belongs to another user', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValueOnce({
        id: SITE_ID,
        userId: 'other-user',
      } as any);

      const res = await POST(makeRequest({ files: [] }), makeParams(SITE_ID));

      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe('forbidden');
    });
  });

  describe('file diff computation', () => {
    it('puts new files in toUpload', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      const res = await POST(
        makeRequest({ files: [{ path: 'new.md', size: 100, sha: 'abc123' }] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.toUpload).toHaveLength(1);
      expect(body.toUpload[0].path).toBe('new.md');
      expect(body.toUpdate).toHaveLength(0);
      expect(body.unchanged).toHaveLength(0);
      expect(body.deleted).toHaveLength(0);
    });

    it('puts files with a changed sha in toUpdate', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'existing.md', sha: 'old-sha' },
      ] as any);

      const res = await POST(
        makeRequest({
          files: [{ path: 'existing.md', size: 100, sha: 'new-sha' }],
        }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.toUpload).toHaveLength(0);
      expect(body.toUpdate).toHaveLength(1);
      expect(body.toUpdate[0].path).toBe('existing.md');
      expect(body.unchanged).toHaveLength(0);
    });

    it('puts files with an identical sha in unchanged', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'same.md', sha: 'same-sha' },
      ] as any);

      const res = await POST(
        makeRequest({
          files: [{ path: 'same.md', size: 100, sha: 'same-sha' }],
        }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.unchanged).toContain('same.md');
      expect(body.toUpload).toHaveLength(0);
      expect(body.toUpdate).toHaveLength(0);
    });

    it('deletes blobs no longer present in local files', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'orphan.md', sha: 'sha1' },
      ] as any);

      const res = await POST(makeRequest({ files: [] }), makeParams(SITE_ID));

      const body = await res.json();
      expect(body.deleted).toContain('orphan.md');
      expect(deleteFile).toHaveBeenCalledWith({
        projectId: SITE_ID,
        path: 'orphan.md',
      });
    });

    it('computes all four categories in one pass', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'updated.md', sha: 'old-sha' },
        { path: 'unchanged.md', sha: 'same-sha' },
        { path: 'orphan.md', sha: 'orphan-sha' },
      ] as any);

      const res = await POST(
        makeRequest({
          files: [
            { path: 'new.md', size: 100, sha: 'new-sha' },
            { path: 'updated.md', size: 100, sha: 'changed-sha' },
            { path: 'unchanged.md', size: 100, sha: 'same-sha' },
          ],
        }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.toUpload.map((f: { path: string }) => f.path)).toContain(
        'new.md',
      );
      expect(body.toUpdate.map((f: { path: string }) => f.path)).toContain(
        'updated.md',
      );
      expect(body.unchanged).toContain('unchanged.md');
      expect(body.deleted).toContain('orphan.md');
    });
  });

  describe('dryRun mode', () => {
    it('returns the diff plan without creating a publish record', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      const res = await POST(
        makeRequest(
          { files: [{ path: 'new.md', size: 100, sha: 'abc' }] },
          { searchParams: 'dryRun=true' },
        ),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.dryRun).toBe(true);
      expect(body.toUpload).toHaveLength(1);
      expect(prisma.publish.create).not.toHaveBeenCalled();
    });

    it('returns empty placeholder URLs without calling R2', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      const res = await POST(
        makeRequest(
          { files: [{ path: 'test.md', size: 100, sha: 'abc' }] },
          { searchParams: 'dryRun=true' },
        ),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.toUpload[0].uploadUrl).toBe('');
      expect(generatePresignedUploadUrl).not.toHaveBeenCalled();
    });
  });

  describe('when there are no changes', () => {
    it('does not create a publish record', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'same.md', sha: 'same-sha' },
      ] as any);

      await POST(
        makeRequest({
          files: [{ path: 'same.md', size: 100, sha: 'same-sha' }],
        }),
        makeParams(SITE_ID),
      );

      expect(prisma.publish.create).not.toHaveBeenCalled();
    });

    it('does not start a finalizer workflow', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'same.md', sha: 'same-sha' },
      ] as any);

      await POST(
        makeRequest({
          files: [{ path: 'same.md', size: 100, sha: 'same-sha' }],
        }),
        makeParams(SITE_ID),
      );

      expect(startPublishFinalizerWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('when there are changes', () => {
    it('creates a publish record', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      await POST(
        makeRequest({ files: [{ path: 'new.md', size: 100, sha: 'abc' }] }),
        makeParams(SITE_ID),
      );

      expect(prisma.publish.create).toHaveBeenCalledOnce();
    });

    it('starts the finalizer workflow with the publish and site IDs', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      await POST(
        makeRequest({ files: [{ path: 'new.md', size: 100, sha: 'abc' }] }),
        makeParams(SITE_ID),
      );

      expect(startPublishFinalizerWorkflow).toHaveBeenCalledWith(
        PUBLISH_ID,
        SITE_ID,
      );
    });

    it('returns the publishId in the response', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      const res = await POST(
        makeRequest({ files: [{ path: 'new.md', size: 100, sha: 'abc' }] }),
        makeParams(SITE_ID),
      );

      expect((await res.json()).publishId).toBe(PUBLISH_ID);
    });

    it('returns summary counts', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'old.md', sha: 'old-sha' },
      ] as any);

      const res = await POST(
        makeRequest({
          files: [
            { path: 'new.md', size: 100, sha: 'abc' },
            { path: 'old.md', size: 100, sha: 'new-sha' },
          ],
        }),
        makeParams(SITE_ID),
      );

      const { summary } = await res.json();
      expect(summary.toUpload).toBe(1);
      expect(summary.toUpdate).toBe(1);
      expect(summary.deleted).toBe(0);
      expect(summary.unchanged).toBe(0);
    });
  });

  describe('Publish and PublishFile record tracking', () => {
    it('creates a Publish record with the correct siteId and source', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      await POST(
        makeRequest({ files: [{ path: 'new.md', size: 100, sha: 'abc' }] }),
        makeParams(SITE_ID),
      );

      expect(prisma.publish.create).toHaveBeenCalledWith({
        data: { siteId: SITE_ID, source: 'cli', legacy: false },
      });
    });

    it('creates a PublishFile with changeType "added" and status "uploading" for new files', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      await POST(
        makeRequest({ files: [{ path: 'new.md', size: 100, sha: 'abc' }] }),
        makeParams(SITE_ID),
      );

      expect(prisma.publishFile.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            publishId: PUBLISH_ID,
            path: 'new.md',
            changeType: 'added',
            status: 'uploading',
            presignedUrlExpiresAt: expect.any(Date),
          }),
        ]),
      });
    });

    it('creates a PublishFile with changeType "updated" and status "uploading" for modified files', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'modified.md', sha: 'old-sha' },
      ] as any);

      await POST(
        makeRequest({
          files: [{ path: 'modified.md', size: 100, sha: 'new-sha' }],
        }),
        makeParams(SITE_ID),
      );

      expect(prisma.publishFile.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            publishId: PUBLISH_ID,
            path: 'modified.md',
            changeType: 'updated',
            status: 'uploading',
          }),
        ]),
      });
    });

    it('creates a PublishFile with changeType "deleted" and status "success" when R2 deletion succeeds', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'gone.md', sha: 'sha1' },
      ] as any);

      await POST(makeRequest({ files: [] }), makeParams(SITE_ID));

      expect(prisma.publishFile.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            publishId: PUBLISH_ID,
            path: 'gone.md',
            changeType: 'deleted',
            status: 'success',
          }),
        ]),
      });
    });

    it('creates a PublishFile with status "error" when R2 deletion fails', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'stuck.md', sha: 'sha1' },
      ] as any);
      vi.mocked(deleteFile).mockRejectedValueOnce(new Error('R2 error'));

      await POST(makeRequest({ files: [] }), makeParams(SITE_ID));

      expect(prisma.publishFile.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            path: 'stuck.md',
            changeType: 'deleted',
            status: 'error',
          }),
        ]),
      });
    });

    it('cancels in-flight PublishFile rows from prior publishes', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      await POST(
        makeRequest({ files: [{ path: 'new.md', size: 100, sha: 'abc' }] }),
        makeParams(SITE_ID),
      );

      expect(prisma.publishFile.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'uploading',
            publishId: { not: PUBLISH_ID },
          }),
          data: { status: 'canceled' },
        }),
      );
    });

    it('does not create PublishFile records for legacy clients', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      await POST(
        makeRequest(
          { files: [{ path: 'new.md', size: 100, sha: 'abc' }] },
          { headers: { 'X-Flowershow-CLI-Version': '2.0.9' } },
        ),
        makeParams(SITE_ID),
      );

      expect(prisma.publishFile.createMany).not.toHaveBeenCalled();
    });
  });
});
