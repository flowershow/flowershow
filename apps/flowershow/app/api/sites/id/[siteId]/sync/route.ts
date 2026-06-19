import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import {
  checkCliVersion,
  getClientInfo,
  isLegacyPublishClient,
  validateAccessToken,
} from '@/lib/cli-auth';
import {
  deleteFile,
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { log, SeverityNumber } from '@/lib/otel-logger';
import {
  clientTypeToPublishSource,
  type FileMetadata,
  PRESIGNED_URL_TTL,
  validatePublishFiles,
} from '@/lib/publish-limits';
import PostHogClient from '@/lib/server-posthog';
import {
  startPublishLifecycle,
  terminatePublishLifecycle,
} from '@/lib/trigger-lifecycle';
import prisma from '@/server/db';

interface UploadUrl {
  path: string;
  uploadUrl: string;
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

async function generateUrlsForFiles(
  filesToProcess: FileMetadata[],
  siteId: string,
  publishId: string | null,
): Promise<UploadUrl[]> {
  return Promise.all(
    filesToProcess.map(async (file) => {
      const extension = file.path.split('.').pop()?.toLowerCase() ?? '';

      const s3Key = `${siteId}/main/raw/${file.path}`;
      const contentType = getContentType(extension);
      const uploadUrl = await generatePresignedUploadUrl(
        s3Key,
        PRESIGNED_URL_TTL,
        contentType,
        publishId ? { 'publish-id': publishId } : undefined,
        publishId ? new Set(['x-amz-meta-publish-id']) : undefined,
      );

      return { path: file.path, uploadUrl, contentType };
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
 * - Deletes files that no longer exist from R2
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

    const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

    const body = await request.json();
    const { files } = body as { files: FileMetadata[] };

    if (!Array.isArray(files)) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Files array is required' },
        { status: 400 },
      );
    }

    const validationError = validatePublishFiles(files);
    if (validationError) return validationError;

    const existingBlobs = await prisma.blob.findMany({
      where: { siteId },
      select: { path: true, sha: true },
    });

    const existingBlobMap = new Map(
      existingBlobs.map((blob) => [blob.path, blob]),
    );
    const localFileMap = new Map(files.map((file) => [file.path, file]));

    const toUpload: FileMetadata[] = [];
    const toUpdate: FileMetadata[] = [];
    const unchanged: string[] = [];
    const toDelete: string[] = [];

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
        toDelete.push(existingBlob.path);
      }
    }

    let uploadUrls: UploadUrl[] = [];
    let updateUrls: UploadUrl[] = [];
    let deletedPaths: string[] = [];
    let publishId: string | undefined;

    if (dryRun) {
      uploadUrls = generateDryRunPlaceholders(toUpload);
      updateUrls = generateDryRunPlaceholders(toUpdate);
      deletedPaths = [...toDelete];
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

      // Cancel in-flight PublishFile rows from any prior publish for overlapping paths
      const newPaths = [
        ...toUpload.map((f) => f.path),
        ...toUpdate.map((f) => f.path),
        ...toDelete,
      ];
      if (newPaths.length > 0) {
        await prisma.publishFile.updateMany({
          where: {
            publish: { siteId },
            path: { in: newPaths },
            status: 'uploading',
            publishId: { not: publish.id },
          },
          data: { status: 'canceled' },
        });
      }

      // Full-site sync supersedes any prior in-progress publish — terminate their finalizers
      const previousInProgress = await prisma.publish.findMany({
        where: { siteId, id: { not: publish.id }, status: 'in_progress' },
        select: { id: true },
      });
      if (previousInProgress.length > 0) {
        try {
          await terminatePublishLifecycle(previousInProgress.map((p) => p.id));
        } catch (termErr) {
          console.error(
            'Failed to terminate previous lifecycle workflows:',
            termErr,
          );
        }
      }

      if (toDelete.length > 0) {
        try {
          deletedPaths = (
            await Promise.all(
              toDelete.map((path) =>
                deleteFile({ projectId: siteId, path })
                  .then(() => path)
                  .catch((error) => {
                    console.error(
                      `[sync] R2 deletion failed for ${siteId}/${path}:`,
                      error,
                    );
                    return null;
                  }),
              ),
            )
          ).filter((p): p is string => p !== null);
          log('Delete files from R2', SeverityNumber.INFO, {
            files_to_delete: toDelete.length,
            files_deleted: deletedPaths.length,
          });

          if (!isLegacy) {
            const deletedSet = new Set(deletedPaths);
            await prisma.publishFile.createMany({
              data: toDelete.map((path) => ({
                publishId: publish.id,
                path,
                changeType: 'deleted' as const,
                status: (deletedSet.has(path) ? 'success' : 'error') as
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
        // Start lifecycle workflow — polls until all PublishFile rows are terminal,
        // then finalizes the Publish record. Handles all cases including delete-only.
        try {
          await startPublishLifecycle(publish.id, siteId);
        } catch (lifecycleErr) {
          console.error('Failed to start lifecycle workflow:', lifecycleErr);
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
