import type { PresignedUrl, SyncResponse } from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import {
  checkCliVersion,
  getClientInfo,
  isLegacyPublishClient,
  validateAccessToken,
} from '@/lib/cli-auth';
import {
  startPublishFinalizerWorkflow,
  terminatePublishFinalizerWorkflows,
} from '@/lib/cloudflare-worker';
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
import prisma from '@/server/db';

async function generateUrlsForFiles(
  filesToProcess: FileMetadata[],
  siteId: string,
  publishId: string | null,
): Promise<PresignedUrl[]> {
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
): PresignedUrl[] {
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
  const posthog = PostHogClient();
  const { siteId } = await props.params;
  try {
    // Check CLI version
    const versionError = checkCliVersion(request);
    if (versionError) return versionError;

    const isLegacy = isLegacyPublishClient(request);

    // Validate access token (CLI or PAT)
    const auth = await validateAccessToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

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

    let uploadUrls: PresignedUrl[] = [];
    let updateUrls: PresignedUrl[] = [];
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

      // Cancel any in-progress Publish
      // TODO don't we need to also switch the status ?
      // and do we really want to terminate explicitly? Or maybe only superseding PublishFiles
      // is enough and then we should let the finalizer workflow terminate on it's own?
      const previousInProgress = await prisma.publish.findMany({
        where: { siteId, id: { not: publish.id }, status: 'in_progress' },
        select: { id: true },
      });
      if (previousInProgress.length > 0) {
        try {
          await terminatePublishFinalizerWorkflows(
            previousInProgress.map((p) => p.id),
          );
        } catch (termErr) {
          log(
            `Failed to terminate previous finalizer workflows for publish IDs: ${previousInProgress
              .map((p) => p.id)
              .join(', ')}`,
            SeverityNumber.ERROR,
            {
              siteId,
              publishIds: previousInProgress.map((p) => p.id).join(','),
              error:
                termErr instanceof Error ? termErr.message : String(termErr),
            },
          );
        }
      }

      if (toDelete.length > 0) {
        // Delete files from R2
        deletedPaths = (
          await Promise.all(
            toDelete.map((path) =>
              deleteFile({ projectId: siteId, path })
                .then(() => path)
                .catch((error) => {
                  log(
                    `R2 deletion failed for ${siteId}/${path}:`,
                    SeverityNumber.ERROR,
                    {
                      siteId,
                      path,
                      error:
                        error instanceof Error ? error.message : String(error),
                    },
                  );
                  return null;
                }),
            ),
          )
        ).filter((p): p is string => p !== null);

        // Create PublishFile records ("delete" type)
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
      }

      [uploadUrls, updateUrls] = await Promise.all([
        generateUrlsForFiles(toUpload, siteId, isLegacy ? null : publish.id),
        generateUrlsForFiles(toUpdate, siteId, isLegacy ? null : publish.id),
      ]);

      if (!isLegacy) {
        const presignedUrlExpiresAt = new Date(
          Date.now() + PRESIGNED_URL_TTL * 1000,
        );

        // Create PublishFile records for uploads and updates with "uploading" status
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

      if (!isLegacy) {
        try {
          await startPublishFinalizerWorkflow(publish.id, siteId);
        } catch (err) {
          log(
            'Failed to start publish finalizer workflow',
            SeverityNumber.ERROR,
            {
              siteId,
              publishId: publish.id,
              error: err instanceof Error ? err.message : String(err),
            },
          );
        }
      }
    }

    const response: SyncResponse = {
      toUpload: uploadUrls,
      toUpdate: updateUrls,
      deleted: deletedPaths,
      unchanged,
      summary: {
        toUpload: uploadUrls.length,
        toUpdate: updateUrls.length,
        deleted: deletedPaths.length,
        unchanged: unchanged.length,
      },
      ...(dryRun && { dryRun: true }),
      ...(publishId !== undefined && { publishId }),
    };

    if (!dryRun) {
      const { client_type } = getClientInfo(request);
      const publish_method =
        client_type === 'obsidian-plugin' ? 'obsidian_plugin' : client_type;
      posthog.capture({
        distinctId: auth.userId,
        event: 'content_published',
        properties: { publish_method, site_id: siteId },
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    const { client_type, client_version } = getClientInfo(request);
    log('Error syncing files', SeverityNumber.ERROR, {
      route: 'POST /api/sites/id/[siteId]/sync',
      siteId,
      client_type,
      client_version: client_version ?? undefined,
      error: error instanceof Error ? error.message : String(error),
    });
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/id/[siteId]/sync',
      client_type,
      client_version,
    });
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to sync files' },
      { status: 500 },
    );
  } finally {
    await posthog.shutdown();
  }
}
