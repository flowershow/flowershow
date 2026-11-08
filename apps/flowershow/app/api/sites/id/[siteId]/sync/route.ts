import {
  type PresignedUrl,
  SyncRequestSchema,
  type SyncResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import {
  checkCliVersion,
  getClientInfo,
  isLegacyPublishClient,
} from '@/lib/cli-auth';
import { startPublishFinalizerWorkflow } from '@/lib/cloudflare-worker';
import {
  deleteFile,
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { mcpInternalCaller } from '@/lib/mcp/internal-request';
import { flushLogs, log, SeverityNumber } from '@/lib/otel-logger';
import {
  clientTypeToPublishSource,
  type FileMetadata,
  PRESIGNED_URL_TTL,
  validateAnonPublishFiles,
  validatePublishFiles,
} from '@/lib/publish-limits';
import PostHogClient from '@/lib/server-posthog';
import { authorizeSiteRequest } from '@/lib/site-auth';
import { loadServerFileState } from '@/lib/site-file-state';
import { noteStorageOverLimit } from '@/lib/storage-limits';
import prisma from '@/server/db';

/**
 * POST /api/sites/id/:siteId/sync
 * Unified sync endpoint for direct publishing (CLI, Obsidian plugin, or other integrations)
 * Accepts fs_cli_* and fs_pat_* tokens (site owner), or a site-scoped
 * fs_claim_* token for an anonymous site (tighter upload limits apply)
 *
 * Compares local files with existing files in the database:
 * - Returns presigned URLs for new or modified files
 * - Deletes files that no longer exist from R2 (mode "replace", the default),
 *   or only the paths listed in `delete` (mode "merge")
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

    // Owner CLI/PAT token, or a site-scoped claim token for an anonymous site
    const access = await authorizeSiteRequest(request, siteId);
    if (!access.ok) return access.response;
    const distinctId =
      access.kind === 'user' ? access.userId : `anon:${siteId}`;

    const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

    const body = await request.json();
    const { files } = body as { files: FileMetadata[] };

    if (!Array.isArray(files)) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Files array is required' },
        { status: 400 },
      );
    }

    const options = SyncRequestSchema.pick({
      mode: true,
      delete: true,
    }).safeParse(body);
    if (!options.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: options.error.message },
        { status: 400 },
      );
    }
    // A mode that was sent but didn't survive parsing (e.g. an app built
    // against a contract that predates it) must never fall back to a full
    // replace, which deletes every file not sent.
    const sentMode = (body as { mode?: unknown }).mode;
    if (sentMode !== undefined && options.data.mode !== sentMode) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          message: `Unsupported sync mode ${JSON.stringify(sentMode)}`,
        },
        { status: 400 },
      );
    }
    const mode = options.data.mode ?? 'replace';
    const deleteList = options.data.delete ?? [];
    if (mode === 'replace' && deleteList.length > 0) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          message: 'delete is only allowed with mode "merge"',
        },
        { status: 400 },
      );
    }

    const validationError =
      access.kind === 'anon'
        ? validateAnonPublishFiles(files)
        : validatePublishFiles(files);
    if (validationError) return validationError;

    const { existingBlobs, inFlightPaths, inFlightAdds } =
      await loadServerFileState(siteId);

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
      } else if (
        existingBlob.sha !== file.sha ||
        inFlightPaths.has(file.path)
      ) {
        toUpdate.push(file);
      } else {
        unchanged.push(file.path);
      }
    }

    if (mode === 'replace') {
      for (const existingBlob of existingBlobs) {
        if (!localFileMap.has(existingBlob.path)) {
          toDelete.push(existingBlob.path);
        }
      }
    } else {
      const deleteSet = new Set(deleteList);
      const overlap = files.find((f) => deleteSet.has(f.path));
      if (overlap) {
        return NextResponse.json(
          {
            error: 'invalid_request',
            message: `Path ${overlap.path} is in both files and delete`,
          },
          { status: 400 },
        );
      }
      // Only paths that exist on this site; unknown paths are ignored.
      for (const existingBlob of existingBlobs) {
        if (deleteSet.has(existingBlob.path)) toDelete.push(existingBlob.path);
      }
      // Anonymous limits apply to the whole site after the change, so a
      // series of merges can't grow it past what one replace could.
      if (access.kind === 'anon') {
        const deleting = new Set(toDelete);
        const kept = existingBlobs
          .filter((b) => !deleting.has(b.path) && !localFileMap.has(b.path))
          .map((b) => ({ path: b.path, size: b.size, sha: b.sha }));
        // New files other publishes are still uploading have no Blob row yet
        // but will land. Count them (file count only: PublishFile has no
        // size). Paths this merge sends or deletes are excluded: those
        // uploads get canceled below.
        const pending = [...inFlightAdds]
          .filter(
            (path) =>
              !existingBlobMap.has(path) &&
              !localFileMap.has(path) &&
              !deleteSet.has(path),
          )
          .map((path) => ({ path, size: 0, sha: 'in-flight' }));
        const siteError = validateAnonPublishFiles([
          ...kept,
          ...pending,
          ...files,
        ]);
        if (siteError) return siteError;
      }
    }

    // Storage limits are advisory (signed-in publishes only; anonymous sites
    // have their own caps above): an over-limit publish is logged, never
    // blocked. Runs for dry runs too.
    if (access.kind === 'user') {
      const { site } = access;
      const deleting = new Set(toDelete);
      const currentSiteBytes = existingBlobs.reduce((n, b) => n + b.size, 0);
      const keptBytes = existingBlobs
        .filter((b) => !deleting.has(b.path) && !localFileMap.has(b.path))
        .reduce((n, b) => n + b.size, 0);
      const projectedSiteBytes =
        keptBytes + files.reduce((n, f) => n + f.size, 0);
      await noteStorageOverLimit(site, currentSiteBytes, projectedSiteBytes);
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
          source: mcpInternalCaller(request)
            ? 'mcp'
            : clientTypeToPublishSource(getClientInfo(request).client_type),
          legacy: isLegacy,
        },
      });
      publishId = publish.id;

      // Cancel uploading files from prior in-progress publishes for this site.
      // Their finalizers will detect completion on the next poll and set completedAt.
      // A replace supersedes every earlier publish; a merge only supersedes
      // earlier uploads of the paths it sends or deletes.
      await prisma.publishFile.updateMany({
        where: {
          publish: { siteId, completedAt: null },
          status: 'uploading',
          publishId: { not: publish.id },
          ...(mode === 'merge' && {
            path: { in: [...files.map((f) => f.path), ...deleteList] },
          }),
        },
        data: { status: 'canceled' },
      });

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

      const effectivePublishId = isLegacy ? null : publish.id;
      [uploadUrls, updateUrls] = await Promise.all([
        Promise.all(
          toUpload.map(async (file) => {
            const extension = file.path.split('.').pop()?.toLowerCase() ?? '';
            const s3Key = `${siteId}/main/raw/${file.path}`;
            const contentType = getContentType(extension);
            const uploadUrl = await generatePresignedUploadUrl(
              s3Key,
              PRESIGNED_URL_TTL,
              contentType,
              effectivePublishId
                ? { 'publish-id': effectivePublishId }
                : undefined,
              effectivePublishId
                ? new Set(['x-amz-meta-publish-id'])
                : undefined,
            );
            return { path: file.path, uploadUrl, contentType };
          }),
        ),
        Promise.all(
          toUpdate.map(async (file) => {
            const extension = file.path.split('.').pop()?.toLowerCase() ?? '';
            const s3Key = `${siteId}/main/raw/${file.path}`;
            const contentType = getContentType(extension);
            const uploadUrl = await generatePresignedUploadUrl(
              s3Key,
              PRESIGNED_URL_TTL,
              contentType,
              effectivePublishId
                ? { 'publish-id': effectivePublishId }
                : undefined,
              effectivePublishId
                ? new Set(['x-amz-meta-publish-id'])
                : undefined,
            );
            return { path: file.path, uploadUrl, contentType };
          }),
        ),
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
      ...(deletedPaths.length < toDelete.length && {
        deleteFailed: toDelete.filter((p) => !deletedPaths.includes(p)),
      }),
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
      const publish_method = mcpInternalCaller(request)
        ? 'mcp'
        : client_type === 'obsidian-plugin'
          ? 'obsidian_plugin'
          : client_type;
      posthog.capture({
        distinctId,
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
    await Promise.all([posthog.shutdown(), flushLogs()]);
  }
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
