import { type Blob, Prisma, PublishSource } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { deleteBlobs } from '@/lib/blob-cleanup';
import {
  checkCliVersion,
  getClientInfo,
  isLegacyPublishClient,
  validateAccessToken,
} from '@/lib/cli-auth';
import {
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { filePathToSlug } from '@/lib/file-path-to-slug';
import { log, SeverityNumber } from '@/lib/otel-logger';
import PostHogClient from '@/lib/server-posthog';
import { startPublishLifecycle } from '@/lib/trigger-lifecycle';
import { ensureSiteCollection } from '@/lib/typesense';
import prisma from '@/server/db';

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;
// Maximum total upload size: 500MB
const MAX_TOTAL_SIZE = 500 * 1024 * 1024;
// Maximum number of files per request
const MAX_FILES = 1000;
// Presigned URL TTL in seconds
const PRESIGNED_URL_TTL = 3600;

interface FileMetadata {
  path: string;
  size: number;
  sha: string;
}

interface UploadUrl {
  path: string;
  uploadUrl: string;
  blobId: string;
  contentType: string;
}

interface SyncResponse {
  toUpload: UploadUrl[];
  toUpdate: UploadUrl[];
  deleted: string[];
  unchanged: string[];
  summary: {
    toUpload: number;
    toUpdate: number;
    deleted: number;
    unchanged: number;
  };
  dryRun?: boolean;
  publishId?: string;
}

function clientTypeToPublishSource(
  clientType: 'cli' | 'obsidian-plugin' | 'unknown',
): PublishSource {
  if (clientType === 'cli') return PublishSource.cli;
  if (clientType === 'obsidian-plugin') return PublishSource.obsidian_plugin;
  return PublishSource.dashboard_upload;
}

async function generateUrlsForFiles(
  filesToProcess: FileMetadata[],
  siteId: string,
  publishId: string | null,
): Promise<UploadUrl[]> {
  return Promise.all(
    filesToProcess.map(async (file) => {
      const extension = file.path.split('.').pop()?.toLowerCase() ?? '';

      const urlPath = ['md', 'mdx', 'canvas'].includes(extension)
        ? filePathToSlug(file.path)
        : null;

      const blob = await prisma.blob.upsert({
        where: { siteId_path: { siteId, path: file.path } },
        create: {
          siteId,
          path: file.path,
          appPath: urlPath,
          size: file.size,
          sha: file.sha,
          metadata: Prisma.JsonNull,
          extension,
        },
        update: { size: file.size, sha: file.sha, appPath: urlPath, extension },
      });

      const s3Key = `${siteId}/main/raw/${file.path}`;
      const contentType = getContentType(extension);
      const uploadUrl = await generatePresignedUploadUrl(
        s3Key,
        PRESIGNED_URL_TTL,
        contentType,
        publishId ? { 'publish-id': publishId } : undefined,
        publishId ? new Set(['x-amz-meta-publish-id']) : undefined,
      );

      return { path: file.path, uploadUrl, blobId: blob.id, contentType };
    }),
  );
}

function generateDryRunPlaceholders(
  filesToProcess: FileMetadata[],
): UploadUrl[] {
  return filesToProcess.map((file) => {
    const extension = file.path.split('.').pop()?.toLowerCase() ?? '';
    return {
      path: file.path,
      uploadUrl: '',
      blobId: '',
      contentType: getContentType(extension),
    };
  });
}

/**
 * POST /api/sites/id/:siteId/sync
 * Unified sync endpoint for direct publishing (CLI, Obsidian plugin, or other integrations)
 * Accepts both fs_cli_* and fs_pat_* tokens
 *
 * Compares local files with existing files in the database:
 * - Returns presigned URLs for new or modified files
 * - Deletes files from R2 and database that no longer exist locally
 * - Identifies unchanged files
 *
 * Query parameters:
 * - dryRun: If true, only returns what would happen without making any changes
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    // Check CLI version
    const versionError = checkCliVersion(request);
    if (versionError) return versionError;

    // Validate access token (CLI or PAT)
    const auth = await validateAccessToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { siteId } = await props.params;

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, userId: true },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'not_found', message: 'Site not found' },
        { status: 404 },
      );
    }

    if (site.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You do not have access to this site' },
        { status: 403 },
      );
    }

    await ensureSiteCollection(siteId);

    const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

    const body = await request.json();
    const { files } = body as { files: FileMetadata[] };

    if (!Array.isArray(files)) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Files array is required' },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: 'payload_too_large',
          message: `Maximum ${MAX_FILES} files per request`,
        },
        { status: 413 },
      );
    }

    let totalSize = 0;
    for (const file of files) {
      if (!file.path || typeof file.size !== 'number' || !file.sha) {
        return NextResponse.json(
          {
            error: 'invalid_request',
            message: 'Each file must have path, size, and sha',
          },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: 'file_too_large',
            message: `File ${file.path} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          },
          { status: 413 },
        );
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          error: 'payload_too_large',
          message: `Total upload size exceeds maximum of ${MAX_TOTAL_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 },
      );
    }

    const existingBlobs = (await prisma.blob.findMany({
      where: { siteId },
      select: { id: true, path: true, sha: true },
    })) as Blob[];

    const existingBlobMap = new Map(
      existingBlobs.map((blob) => [blob.path, blob]),
    );
    const localFileMap = new Map(files.map((file) => [file.path, file]));

    const toUpload: FileMetadata[] = [];
    const toUpdate: FileMetadata[] = [];
    const unchanged: string[] = [];
    const toDelete: Array<{ id: string; path: string }> = [];

    for (const file of files) {
      const existingBlob = existingBlobMap.get(file.path);
      if (!existingBlob) {
        toUpload.push(file);
      } else if (existingBlob.sha !== file.sha) {
        toUpdate.push(file);
      } else {
        unchanged.push(file.path);
      }
    }

    for (const existingBlob of existingBlobs) {
      if (!localFileMap.has(existingBlob.path)) {
        toDelete.push({ id: existingBlob.id, path: existingBlob.path });
      }
    }

    let uploadUrls: UploadUrl[] = [];
    let updateUrls: UploadUrl[] = [];
    let deletedPaths: string[] = [];
    let publishId: string | undefined;

    if (dryRun) {
      uploadUrls = generateDryRunPlaceholders(toUpload);
      updateUrls = generateDryRunPlaceholders(toUpdate);
      deletedPaths = toDelete.map((f) => f.path);
    } else if (
      toUpload.length > 0 ||
      toUpdate.length > 0 ||
      toDelete.length > 0
    ) {
      const isLegacy = isLegacyPublishClient(request);

      const publish = await prisma.publish.create({
        data: {
          siteId,
          source: clientTypeToPublishSource(getClientInfo(request).client_type),
          legacy: isLegacy,
        },
      });
      publishId = publish.id;

      const previousPublishIds = await prisma.publish.findMany({
        where: { siteId, id: { not: publish.id } },
        select: { id: true },
      });
      if (previousPublishIds.length > 0) {
        await prisma.publishFile.updateMany({
          where: {
            publishId: { in: previousPublishIds.map((p) => p.id) },
            status: 'uploading',
          },
          data: { status: 'canceled' },
        });
      }

      if (toDelete.length > 0) {
        try {
          deletedPaths = await deleteBlobs(siteId, toDelete);
          log(
            'Delete files from R2, Typesense, and database',
            SeverityNumber.INFO,
            {
              files_to_delete: toDelete.length,
              files_deleted: deletedPaths.length,
            },
          );

          if (!isLegacy) {
            const deletedSet = new Set(deletedPaths);
            await prisma.publishFile.createMany({
              data: toDelete.map((f) => ({
                publishId: publish.id,
                path: f.path,
                changeType: 'deleted' as const,
                status: (deletedSet.has(f.path) ? 'success' : 'error') as
                  | 'success'
                  | 'error',
              })),
            });
          }
        } finally {
          revalidateTag(siteId);
        }
      }

      try {
        [uploadUrls, updateUrls] = await Promise.all([
          generateUrlsForFiles(toUpload, siteId, isLegacy ? null : publish.id),
          generateUrlsForFiles(toUpdate, siteId, isLegacy ? null : publish.id),
        ]);

        log('Generate presigned URLs', SeverityNumber.INFO, {
          files_to_upload: toUpload.length,
          files_to_update: toUpdate.length,
        });

        if (!isLegacy) {
          const presignedUrlExpiresAt = new Date(
            Date.now() + PRESIGNED_URL_TTL * 1000,
          );
          const uploadFileRows = [
            ...toUpload.map((f) => ({
              publishId: publish.id,
              path: f.path,
              changeType: 'added' as const,
              status: 'uploading' as const,
              presignedUrlExpiresAt,
            })),
            ...toUpdate.map((f) => ({
              publishId: publish.id,
              path: f.path,
              changeType: 'updated' as const,
              status: 'uploading' as const,
              presignedUrlExpiresAt,
            })),
          ];
          if (uploadFileRows.length > 0) {
            await prisma.publishFile.createMany({ data: uploadFileRows });
          }
        }
      } finally {
        revalidateTag(siteId);
      }

      if (!isLegacy) {
        const hasUploadingFiles = toUpload.length + toUpdate.length > 0;
        if (hasUploadingFiles) {
          // Start lifecycle workflow — waits for queue consumer to signal completion
          try {
            await startPublishLifecycle(publish.id, siteId);
          } catch (lifecycleErr) {
            console.error('Failed to start lifecycle workflow:', lifecycleErr);
          }
        } else {
          // Deletions only — all PublishFile rows are already terminal; finalize now
          await prisma.publish.update({
            where: { id: publish.id },
            data: { status: 'success', completedAt: new Date() },
          });
        }
      }
    }

    const response: SyncResponse = {
      toUpload: uploadUrls!,
      toUpdate: updateUrls!,
      deleted: deletedPaths,
      unchanged,
      summary: {
        toUpload: uploadUrls!.length,
        toUpdate: updateUrls!.length,
        deleted: deletedPaths.length,
        unchanged: unchanged.length,
      },
      ...(dryRun && { dryRun: true }),
      ...(publishId !== undefined && { publishId }),
    };

    if (!dryRun) {
      const posthog = PostHogClient();
      const { client_type } = getClientInfo(request);
      const publish_method =
        client_type === 'obsidian-plugin' ? 'obsidian_plugin' : client_type;
      posthog.capture({
        distinctId: auth.userId,
        event: 'content_published',
        properties: { publish_method, site_id: siteId },
      });
      await posthog.shutdown();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error syncing files:', error);
    const posthog = PostHogClient();
    const { client_type, client_version } = getClientInfo(request);
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/id/[siteId]/sync',
      client_type,
      client_version,
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to sync files' },
      { status: 500 },
    );
  }
}
