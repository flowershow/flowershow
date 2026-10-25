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
    publishFile: {
      updateMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
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

const posthogCapture = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: posthogCapture,
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/otel-logger', () => ({
  log: vi.fn(),
  flushLogs: vi.fn().mockResolvedValue(undefined),
  SeverityNumber: { ERROR: 17 },
}));

import {
  ANONYMOUS_USER_ID,
  generateSiteClaimToken,
} from '@/lib/anonymous-user';
import { validateAccessToken } from '@/lib/cli-auth';
import { startPublishFinalizerWorkflow } from '@/lib/cloudflare-worker';
import { deleteFile, generatePresignedUploadUrl } from '@/lib/content-store';
import { markMcpInternal } from '@/lib/mcp/internal-request';
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
    vi.mocked(prisma.publishFile.findMany).mockResolvedValue([]);
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

  describe('merge mode', () => {
    const existing = [
      { path: 'index.md', sha: 'index-sha', size: 10 },
      { path: 'about.md', sha: 'about-sha', size: 10 },
      { path: 'old.md', sha: 'old-sha', size: 10 },
    ];

    it('keeps existing files that are not sent', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(existing as any);

      const res = await POST(
        makeRequest({
          mode: 'merge',
          files: [{ path: 'about.md', size: 12, sha: 'about-new' }],
        }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.toUpdate.map((f: { path: string }) => f.path)).toEqual([
        'about.md',
      ]);
      expect(body.deleted).toEqual([]);
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it('deletes only the paths listed in delete, ignoring unknown paths', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(existing as any);

      const res = await POST(
        makeRequest({
          mode: 'merge',
          files: [],
          delete: ['old.md', 'never-existed.md'],
        }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deleted).toEqual(['old.md']);
      expect(deleteFile).toHaveBeenCalledTimes(1);
      expect(deleteFile).toHaveBeenCalledWith({
        projectId: SITE_ID,
        path: 'old.md',
      });
      expect(prisma.publishFile.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ path: 'old.md', changeType: 'deleted' }),
        ],
      });
    });

    it('rejects delete without mode merge', async () => {
      const res = await POST(
        makeRequest({ files: [], delete: ['old.md'] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(400);
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it('rejects a path that is both sent and deleted', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(existing as any);

      const res = await POST(
        makeRequest({
          mode: 'merge',
          files: [{ path: 'old.md', size: 1, sha: 'x' }],
          delete: ['old.md'],
        }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(400);
      expect(prisma.publish.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown mode', async () => {
      const res = await POST(
        makeRequest({ files: [], mode: 'append' }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(400);
    });

    it('applies the anonymous limits to the whole site after the merge', async () => {
      const ANON_OWNER = '3f1c2b7a-1d2e-4f3a-9b4c-5d6e7f8a9b0c';
      vi.mocked(prisma.site.findUnique).mockResolvedValue({
        id: SITE_ID,
        userId: ANONYMOUS_USER_ID,
        anonymousOwnerId: ANON_OWNER,
        expiresAt: new Date(Date.now() + 86400000),
      } as any);
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(
        Array.from({ length: 200 }, (_, i) => ({
          path: `p-${i}.html`,
          sha: `s-${i}`,
          size: 10,
        })) as any,
      );

      const res = await POST(
        makeRequest(
          {
            mode: 'merge',
            files: [{ path: 'one-more.html', size: 10, sha: 'x' }],
          },
          {
            headers: {
              Authorization: `Bearer ${generateSiteClaimToken(SITE_ID, ANON_OWNER)}`,
            },
          },
        ),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(413);
      expect(prisma.publish.create).not.toHaveBeenCalled();
    });

    describe('anonymous whole-site limits', () => {
      const ANON_OWNER = '3f1c2b7a-1d2e-4f3a-9b4c-5d6e7f8a9b0c';
      const anonRequest = (body: unknown) =>
        makeRequest(body, {
          headers: {
            Authorization: `Bearer ${generateSiteClaimToken(SITE_ID, ANON_OWNER)}`,
          },
        });
      const blobs = (n: number, size = 10) =>
        Array.from({ length: n }, (_, i) => ({
          path: `p-${i}.html`,
          sha: `s-${i}`,
          size,
        }));

      beforeEach(() => {
        vi.mocked(prisma.site.findUnique).mockResolvedValue({
          id: SITE_ID,
          userId: ANONYMOUS_USER_ID,
          anonymousOwnerId: ANON_OWNER,
          expiresAt: new Date(Date.now() + 86400000),
        } as any);
      });

      it('allows updating a file on a site at exactly 200 files', async () => {
        vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(
          blobs(200) as any,
        );

        const res = await POST(
          anonRequest({
            mode: 'merge',
            files: [{ path: 'p-0.html', size: 10, sha: 'changed' }],
          }),
          makeParams(SITE_ID),
        );

        expect(res.status).toBe(200);
        expect((await res.json()).summary.toUpdate).toBe(1);
      });

      it('allows adding a file to a full site when a delete frees room', async () => {
        vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(
          blobs(200) as any,
        );

        const res = await POST(
          anonRequest({
            mode: 'merge',
            files: [{ path: 'new.html', size: 10, sha: 'x' }],
            delete: ['p-1.html'],
          }),
          makeParams(SITE_ID),
        );

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.summary.toUpload).toBe(1);
        expect(body.deleted).toEqual(['p-1.html']);
      });

      it('returns 413 when the merge takes the site over 50 MB', async () => {
        // 5 existing files of 10 MB each = 50 MB; one more byte is too much.
        vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(
          blobs(5, 10 * 1024 * 1024) as any,
        );

        const res = await POST(
          anonRequest({
            mode: 'merge',
            files: [{ path: 'extra.html', size: 1, sha: 'x' }],
          }),
          makeParams(SITE_ID),
        );

        expect(res.status).toBe(413);
        expect((await res.json()).message).toMatch(/50 MB/);
        expect(prisma.publish.create).not.toHaveBeenCalled();
      });
    });

    it('cancels only earlier in-flight uploads of the paths it sends or deletes', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(existing as any);

      await POST(
        makeRequest({
          mode: 'merge',
          files: [{ path: 'about.md', size: 12, sha: 'about-new' }],
          delete: ['old.md'],
        }),
        makeParams(SITE_ID),
      );

      expect(prisma.publishFile.updateMany).toHaveBeenCalledWith({
        where: {
          publish: { siteId: SITE_ID, completedAt: null },
          status: 'uploading',
          publishId: { not: PUBLISH_ID },
          path: { in: ['about.md', 'old.md'] },
        },
        data: { status: 'canceled' },
      });
    });

    it('reports paths whose deletion failed in deleteFailed', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce(existing as any);
      vi.mocked(deleteFile).mockRejectedValueOnce(new Error('R2 error'));

      const res = await POST(
        makeRequest({ mode: 'merge', files: [], delete: ['old.md'] }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.deleted).toEqual([]);
      expect(body.deleteFailed).toEqual(['old.md']);
    });
  });

  describe('in-flight publishes (Blob table lagging the worker)', () => {
    const blobUpdatedAt = new Date('2026-01-01T00:00:00Z');
    const laterPublish = new Date('2026-01-01T00:05:00Z');

    it('does not report a path as unchanged while another publish is still uploading it', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'a.md', sha: 'same', updatedAt: blobUpdatedAt },
      ] as any);
      vi.mocked(prisma.publishFile.findMany).mockResolvedValueOnce([
        {
          path: 'a.md',
          status: 'uploading',
          changeType: 'updated',
          publish: { startedAt: laterPublish },
        },
      ] as any);

      const res = await POST(
        makeRequest({ files: [{ path: 'a.md', size: 1, sha: 'same' }] }),
        makeParams(SITE_ID),
      );
      const body = await res.json();
      expect(body.unchanged).toEqual([]);
      expect(body.toUpdate.map((f: any) => f.path)).toEqual(['a.md']);
    });

    it('scopes the PublishFile lookup to the site, relevant rows and a bounded time window', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([] as any);
      const before = Date.now();

      await POST(
        makeRequest({ files: [{ path: 'a.md', size: 1, sha: 'x' }] }),
        makeParams(SITE_ID),
      );

      const { where } = vi.mocked(prisma.publishFile.findMany).mock
        .calls[0]?.[0] as any;
      expect(where.OR).toEqual([
        { status: 'uploading' },
        { status: 'success', changeType: 'deleted' },
      ]);
      expect(where.publish.siteId).toBe(SITE_ID);
      // Bounded for unfinished publishes too, so orphans age out
      const gt = where.publish.startedAt.gt.getTime();
      expect(gt).toBeLessThan(before);
      expect(gt).toBeGreaterThan(before - 60 * 60 * 1000);
    });

    it('re-uploads a file another publish deleted before the Blob row was removed', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'gone.md', sha: 'same', updatedAt: blobUpdatedAt },
      ] as any);
      vi.mocked(prisma.publishFile.findMany).mockResolvedValueOnce([
        {
          path: 'gone.md',
          status: 'success',
          changeType: 'deleted',
          publish: { startedAt: laterPublish },
        },
      ] as any);

      const res = await POST(
        makeRequest({ files: [{ path: 'gone.md', size: 1, sha: 'same' }] }),
        makeParams(SITE_ID),
      );
      const body = await res.json();
      expect(body.unchanged).toEqual([]);
      expect(body.toUpload.map((f: any) => f.path)).toEqual(['gone.md']);
    });

    it('does not report an already-deleted path as deleted again', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'gone.md', sha: 'x', updatedAt: blobUpdatedAt },
      ] as any);
      vi.mocked(prisma.publishFile.findMany).mockResolvedValueOnce([
        {
          path: 'gone.md',
          status: 'success',
          changeType: 'deleted',
          publish: { startedAt: laterPublish },
        },
      ] as any);

      const res = await POST(
        makeRequest({ files: [{ path: 'other.md', size: 1, sha: 'y' }] }),
        makeParams(SITE_ID),
      );
      const body = await res.json();
      expect(body.deleted).toEqual([]);
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it('ignores a delete older than the Blob row (file was re-added since)', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'back.md', sha: 'same', updatedAt: laterPublish },
      ] as any);
      vi.mocked(prisma.publishFile.findMany).mockResolvedValueOnce([
        {
          path: 'back.md',
          status: 'success',
          changeType: 'deleted',
          publish: { startedAt: blobUpdatedAt },
        },
      ] as any);

      const res = await POST(
        makeRequest({ files: [{ path: 'back.md', size: 1, sha: 'same' }] }),
        makeParams(SITE_ID),
      );
      const body = await res.json();
      expect(body.unchanged).toEqual(['back.md']);
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

    it('records MCP publishes with source mcp and publish_method mcp', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      await POST(
        markMcpInternal(
          makeRequest({ files: [{ path: 'new.md', size: 100, sha: 'abc' }] }),
          { userId: USER_ID },
        ),
        makeParams(SITE_ID),
      );

      expect(prisma.publish.create).toHaveBeenCalledWith({
        data: { siteId: SITE_ID, source: 'mcp', legacy: false },
      });
      expect(posthogCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'content_published',
          properties: expect.objectContaining({ publish_method: 'mcp' }),
        }),
      );
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

      // Replace mode supersedes every earlier upload, whatever its path.
      expect(prisma.publishFile.updateMany).toHaveBeenCalledWith({
        where: {
          publish: { siteId: SITE_ID, completedAt: null },
          status: 'uploading',
          publishId: { not: PUBLISH_ID },
        },
        data: { status: 'canceled' },
      });
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

  describe('claim-token (anonymous) publishing', () => {
    const ANON_OWNER = '3f1c2b7a-1d2e-4f3a-9b4c-5d6e7f8a9b0c';
    const anonSite = {
      id: SITE_ID,
      userId: ANONYMOUS_USER_ID,
      anonymousOwnerId: ANON_OWNER,
      expiresAt: new Date(Date.now() + 86400000),
    };
    const claimHeaders = (siteId = SITE_ID) => ({
      Authorization: `Bearer ${generateSiteClaimToken(siteId, ANON_OWNER)}`,
    });
    const htmlFiles = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        path: `page-${i}.html`,
        size: 10,
        sha: `sha-${i}`,
      }));

    it('returns 413 when an anonymous site uploads more than 200 files', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValue(anonSite as any);

      const res = await POST(
        makeRequest({ files: htmlFiles(201) }, { headers: claimHeaders() }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(413);
      expect((await res.json()).error).toBe('payload_too_large');
      expect(validateAccessToken).not.toHaveBeenCalled();
      expect(prisma.publish.create).not.toHaveBeenCalled();
    });

    it('returns upload URLs for a small HTML publish on an anonymous site', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValue(anonSite as any);

      const res = await POST(
        makeRequest({ files: htmlFiles(2) }, { headers: claimHeaders() }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.toUpload).toHaveLength(2);
      expect(body.toUpload[0].uploadUrl).toBe(
        'https://s3.example.com/presigned',
      );
      expect(validateAccessToken).not.toHaveBeenCalled();
      expect(prisma.site.findUnique).toHaveBeenCalledTimes(1);
      expect(posthogCapture).toHaveBeenCalledWith(
        expect.objectContaining({ distinctId: `anon:${SITE_ID}` }),
      );
    });

    it('passes through a 403 when the claim token is for a different site', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValue(anonSite as any);

      const res = await POST(
        makeRequest(
          { files: htmlFiles(1) },
          { headers: claimHeaders('some-other-site') },
        ),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe('forbidden');
      expect(prisma.publish.create).not.toHaveBeenCalled();
    });

    it('returns 410 when the anonymous site has expired', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValue({
        ...anonSite,
        expiresAt: new Date(Date.now() - 1000),
      } as any);

      const res = await POST(
        makeRequest({ files: htmlFiles(1) }, { headers: claimHeaders() }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(410);
    });

    it('returns 401 for a tampered claim token', async () => {
      const res = await POST(
        makeRequest(
          { files: htmlFiles(1) },
          { headers: { Authorization: 'Bearer fs_claim_not-a-jwt' } },
        ),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(401);
    });
  });
});
