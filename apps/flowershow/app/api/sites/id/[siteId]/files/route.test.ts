import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  validateAccessToken: vi.fn().mockResolvedValue({ userId: 'user-1' }),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/server/auth', () => ({
  authOptions: {},
}));

vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn() },
    blob: { findMany: vi.fn() },
    publish: { create: vi.fn() },
    publishFile: { updateMany: vi.fn(), create: vi.fn() },
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

import { DELETE, POST } from './route';
import { validateAccessToken } from '@/lib/cli-auth';
import { getServerSession } from 'next-auth';
import { deleteFile } from '@/lib/content-store';
import { startPublishFinalizerWorkflow } from '@/lib/cloudflare-worker';
import prisma from '@/server/db';

const SITE_ID = 'site-1';
const USER_ID = 'user-1';
const PUBLISH_ID = 'publish-1';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/sites/id/${SITE_ID}/files`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fs_cli_test',
      'X-Flowershow-CLI-Version': '2.1.0',
    },
  });
}

function makeDeleteRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/sites/id/${SITE_ID}/files`, {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fs_cli_test',
      'X-Flowershow-CLI-Version': '2.1.0',
    },
  });
}

function makeParams(siteId: string) {
  return { params: Promise.resolve({ siteId }) };
}

const ownedSite = { id: SITE_ID, userId: USER_ID };
const aFile = { path: 'notes.md', size: 100, sha: 'abc123' };

describe('POST /api/sites/id/[siteId]/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.site.findUnique).mockResolvedValue(ownedSite as any);
    vi.mocked(prisma.blob.findMany).mockResolvedValue([]);
    vi.mocked(prisma.publish.create).mockResolvedValue({
      id: PUBLISH_ID,
    } as any);
    vi.mocked(prisma.publishFile.updateMany).mockResolvedValue({
      count: 0,
    } as any);
    vi.mocked(prisma.publishFile.create).mockResolvedValue({} as any);
    vi.mocked(validateAccessToken).mockResolvedValue({ userId: USER_ID });
  });

  describe('authentication', () => {
    it('returns 401 when no token and no session', async () => {
      vi.mocked(validateAccessToken).mockResolvedValueOnce(null);
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await POST(
        makePostRequest({ files: [aFile] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe('unauthorized');
    });

    it('accepts session-based auth when no token is provided', async () => {
      vi.mocked(validateAccessToken).mockResolvedValueOnce(null);
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: USER_ID },
      } as any);

      const res = await POST(
        makePostRequest({ files: [aFile] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(200);
    });
  });

  describe('site access', () => {
    it('returns 404 when site does not exist', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValueOnce(null);

      const res = await POST(
        makePostRequest({ files: [aFile] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe('not_found');
    });

    it('returns 403 when site belongs to another user', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValueOnce({
        id: SITE_ID,
        userId: 'other-user',
      } as any);

      const res = await POST(
        makePostRequest({ files: [aFile] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe('forbidden');
    });
  });

  describe('request validation', () => {
    it('returns 400 when files array is empty', async () => {
      const res = await POST(
        makePostRequest({ files: [] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('invalid_request');
    });

    it('returns 400 when body is malformed', async () => {
      const res = await POST(
        makePostRequest({ not_files: true }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(400);
    });
  });

  describe('happy path', () => {
    it('returns presigned upload URLs for each file', async () => {
      const res = await POST(
        makePostRequest({ files: [aFile] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.files).toHaveLength(1);
      expect(body.files[0].path).toBe(aFile.path);
      expect(body.files[0].uploadUrl).toBe('https://s3.example.com/presigned');
    });

    it('returns a publishId', async () => {
      const res = await POST(
        makePostRequest({ files: [aFile] }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.publishId).toBe(PUBLISH_ID);
    });

    it('creates a publish record', async () => {
      await POST(makePostRequest({ files: [aFile] }), makeParams(SITE_ID));

      expect(prisma.publish.create).toHaveBeenCalledOnce();
    });

    it('starts the finalizer workflow', async () => {
      await POST(makePostRequest({ files: [aFile] }), makeParams(SITE_ID));

      expect(startPublishFinalizerWorkflow).toHaveBeenCalledWith(
        PUBLISH_ID,
        SITE_ID,
      );
    });

    it('includes a contentType for each file', async () => {
      const res = await POST(
        makePostRequest({
          files: [{ path: 'image.png', size: 512, sha: 'abc' }],
        }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.files[0].contentType).toBeDefined();
    });
  });

  describe('Publish and PublishFile record tracking', () => {
    it('creates a PublishFile with changeType "added" and status "uploading" for a new file', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      await POST(makePostRequest({ files: [aFile] }), makeParams(SITE_ID));

      expect(prisma.publishFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          publishId: PUBLISH_ID,
          path: aFile.path,
          changeType: 'added',
          status: 'uploading',
          presignedUrlExpiresAt: expect.any(Date),
        }),
      });
    });

    it('creates a PublishFile with changeType "added" when sha differs from the existing blob', async () => {
      // NOTE: this differs from /sync which uses "updated" for the same scenario.
      // /files treats any sha mismatch as "added" (content not yet in R2 at that sha).
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: aFile.path, sha: 'different-sha' },
      ] as any);

      await POST(makePostRequest({ files: [aFile] }), makeParams(SITE_ID));

      expect(prisma.publishFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          path: aFile.path,
          changeType: 'added',
          status: 'uploading',
        }),
      });
    });

    it('creates a PublishFile with changeType "updated" when sha matches the existing blob', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: aFile.path, sha: aFile.sha },
      ] as any);

      await POST(makePostRequest({ files: [aFile] }), makeParams(SITE_ID));

      expect(prisma.publishFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          path: aFile.path,
          changeType: 'updated',
          status: 'uploading',
        }),
      });
    });

    it('cancels in-flight PublishFile rows from prior publishes for overlapping paths', async () => {
      await POST(makePostRequest({ files: [aFile] }), makeParams(SITE_ID));

      expect(prisma.publishFile.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            path: { in: [aFile.path] },
            status: 'uploading',
            publishId: { not: PUBLISH_ID },
          }),
          data: { status: 'canceled' },
        }),
      );
    });

    it('does not create PublishFile records for legacy clients', async () => {
      const legacyReq = new NextRequest(
        `http://localhost/api/sites/id/${SITE_ID}/files`,
        {
          method: 'POST',
          body: JSON.stringify({ files: [aFile] }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fs_cli_test',
            'X-Flowershow-CLI-Version': '2.0.9',
          },
        },
      );

      await POST(legacyReq, makeParams(SITE_ID));

      expect(prisma.publishFile.create).not.toHaveBeenCalled();
    });
  });
});

describe('DELETE /api/sites/id/[siteId]/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.site.findUnique).mockResolvedValue(ownedSite as any);
    vi.mocked(prisma.blob.findMany).mockResolvedValue([]);
    vi.mocked(validateAccessToken).mockResolvedValue({ userId: USER_ID });
  });

  describe('authentication', () => {
    it('returns 401 when no auth token', async () => {
      vi.mocked(validateAccessToken).mockResolvedValueOnce(null);

      const res = await DELETE(
        makeDeleteRequest({ paths: ['notes.md'] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe('unauthorized');
    });
  });

  describe('site access', () => {
    it('returns 404 when site does not exist', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValueOnce(null);

      const res = await DELETE(
        makeDeleteRequest({ paths: ['notes.md'] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(404);
    });

    it('returns 403 when site belongs to another user', async () => {
      vi.mocked(prisma.site.findUnique).mockResolvedValueOnce({
        id: SITE_ID,
        userId: 'other-user',
      } as any);

      const res = await DELETE(
        makeDeleteRequest({ paths: ['notes.md'] }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(403);
    });
  });

  describe('request validation', () => {
    it('returns 400 when paths array is missing', async () => {
      const res = await DELETE(
        makeDeleteRequest({ not_paths: true }),
        makeParams(SITE_ID),
      );

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('invalid_request');
    });
  });

  describe('file classification', () => {
    it('puts paths found in the DB in deleted and calls deleteFile', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'notes.md' },
      ] as any);

      const res = await DELETE(
        makeDeleteRequest({ paths: ['notes.md'] }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.deleted).toContain('notes.md');
      expect(body.notFound).toHaveLength(0);
      expect(deleteFile).toHaveBeenCalledWith({
        projectId: SITE_ID,
        path: 'notes.md',
      });
    });

    it('puts paths absent from the DB in notFound without calling deleteFile', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([]);

      const res = await DELETE(
        makeDeleteRequest({ paths: ['ghost.md'] }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.notFound).toContain('ghost.md');
      expect(body.deleted).toHaveLength(0);
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it('splits a mixed batch into deleted and notFound', async () => {
      vi.mocked(prisma.blob.findMany).mockResolvedValueOnce([
        { path: 'exists.md' },
      ] as any);

      const res = await DELETE(
        makeDeleteRequest({ paths: ['exists.md', 'missing.md'] }),
        makeParams(SITE_ID),
      );

      const body = await res.json();
      expect(body.deleted).toContain('exists.md');
      expect(body.notFound).toContain('missing.md');
    });
  });
});
