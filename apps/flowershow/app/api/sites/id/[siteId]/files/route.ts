import {
  DeleteFilesRequestSchema,
  type DeleteFilesResponse,
  PublishFilesRequestSchema,
  type PublishFilesResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  getClientInfo,
  isLegacyPublishClient,
  validateAccessToken,
} from '@/lib/cli-auth';
import { startPublishFinalizerWorkflow } from '@/lib/cloudflare-worker';
import {
  deleteFile,
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { flushLogs, log, SeverityNumber } from '@/lib/otel-logger';
import {
  clientTypeToPublishSource,
  MAX_FILES,
  PRESIGNED_URL_TTL,
  validatePublishFiles,
} from '@/lib/publish-limits';
import PostHogClient from '@/lib/server-posthog';
import { authOptions } from '@/server/auth';
import prisma from '@/server/db';

/**
 * POST /api/sites/id/:siteId/files
 * Publish specific files without affecting other files
 * Returns presigned URLs for uploading the specified files
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const posthog = PostHogClient();
  const { siteId } = await props.params;
  try {
    const isLegacy = isLegacyPublishClient(request);
    let userId: string | null = null;
    const tokenAuth = await validateAccessToken(request);
    if (tokenAuth?.userId) {
      userId = tokenAuth.userId;
    } else {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }
    if (!userId) {
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

    if (site.userId !== userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You do not have access to this site' },
        { status: 403 },
      );
    }

    const parsedBody = PublishFilesRequestSchema.safeParse(
      await request.json(),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Files array is required' },
        { status: 400 },
      );
    }

    const { files } = parsedBody.data;

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Files array must not be empty' },
        { status: 400 },
      );
    }

    const validationError = validatePublishFiles(files);
    if (validationError) return validationError;

    // Fetch existing blobs to determine changeType (added vs updated)
    const existingBlobs = await prisma.blob.findMany({
      where: { siteId, path: { in: files.map((f) => f.path) } },
      select: { path: true, sha: true },
    });

    const existingBlobMap = new Map(existingBlobs.map((b) => [b.path, b]));

    // Create Publish record
    const publish = await prisma.publish.create({
      data: {
        siteId,
        source: clientTypeToPublishSource(getClientInfo(request).client_type),
        legacy: isLegacy,
      },
    });

    // Cancel in-flight PublishFile rows from any prior publish for overlapping paths.
    // Unlike /sync, we do NOT terminate previous finalizers — concurrent /files
    // publishes may cover completely different paths and can coexist.
    const newPaths = files.map((f) => f.path);
    if (!isLegacy && newPaths.length > 0) {
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

    const presignedUrlExpiresAt = new Date(
      Date.now() + PRESIGNED_URL_TTL * 1000,
    );

    const uploadUrls = await Promise.all(
      files.map(async (file) => {
        const extension = file.path.split('.').pop()?.toLowerCase() ?? '';
        const s3Key = `${siteId}/main/raw/${file.path}`;
        const contentType = getContentType(extension);
        const uploadUrl = await generatePresignedUploadUrl(
          s3Key,
          PRESIGNED_URL_TTL,
          contentType,
          isLegacy ? undefined : { 'publish-id': publish.id },
          isLegacy ? undefined : new Set(['x-amz-meta-publish-id']),
        );

        if (!isLegacy) {
          const existing = existingBlobMap.get(file.path);
          const changeType = (
            !existing || existing.sha !== file.sha ? 'added' : 'updated'
          ) as 'added' | 'updated';

          await prisma.publishFile.create({
            data: {
              publishId: publish.id,
              path: file.path,
              changeType,
              status: 'uploading',
              presignedUrlExpiresAt,
            },
          });
        }

        return { path: file.path, uploadUrl, contentType };
      }),
    );

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

    const response: PublishFilesResponse = {
      files: uploadUrls,
      publishId: publish.id,
    };

    const { client_type } = getClientInfo(request);
    const publish_method =
      client_type === 'obsidian-plugin' ? 'obsidian_plugin' : client_type;
    posthog.capture({
      distinctId: userId,
      event: 'content_published',
      properties: { publish_method, site_id: siteId },
    });

    return NextResponse.json(response);
  } catch (error) {
    const { client_type, client_version } = getClientInfo(request);
    log('Error publishing files', SeverityNumber.ERROR, {
      route: 'POST /api/sites/id/[siteId]/files',
      siteId,
      client_type,
      client_version: client_version ?? undefined,
      error: error instanceof Error ? error.message : String(error),
    });
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/id/[siteId]/files',
      client_type,
      client_version,
    });
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to publish files' },
      { status: 500 },
    );
  } finally {
    await Promise.all([posthog.shutdown(), flushLogs()]);
  }
}

/**
 * DELETE /api/sites/id/:siteId/files
 * Delete/unpublish specific files from the site
 *
 * Request body:
 * {
 *   paths: string[] // Array of file paths to delete
 * }
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const posthog = PostHogClient();
  const { siteId } = await props.params;
  try {
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

    const parsedBody = DeleteFilesRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Paths array is required' },
        { status: 400 },
      );
    }

    const { paths } = parsedBody.data;

    if (paths.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: 'payload_too_large',
          message: `Maximum ${MAX_FILES} files per request`,
        },
        { status: 413 },
      );
    }

    const existingBlobs = await prisma.blob.findMany({
      where: { siteId, path: { in: paths } },
      select: { path: true },
    });

    const existingPaths = new Set(existingBlobs.map((b) => b.path));
    const deleted: string[] = [];
    const notFound: string[] = [];

    for (const path of paths) {
      if (existingPaths.has(path)) {
        deleted.push(path);
      } else {
        notFound.push(path);
      }
    }

    if (deleted.length > 0) {
      await Promise.all(
        deleted.map((path) =>
          deleteFile({ projectId: siteId, path }).catch((error) => {
            log(
              `R2 deletion failed for ${siteId}/${path}:`,
              SeverityNumber.ERROR,
              {
                siteId,
                path,
                error: error instanceof Error ? error.message : String(error),
              },
            );
          }),
        ),
      );
    }

    const response: DeleteFilesResponse = { deleted, notFound };

    return NextResponse.json(response);
  } catch (error) {
    const { client_type, client_version } = getClientInfo(request);
    log('Error deleting files', SeverityNumber.ERROR, {
      route: 'DELETE /api/sites/id/[siteId]/files',
      siteId,
      client_type,
      client_version: client_version ?? undefined,
      error: error instanceof Error ? error.message : String(error),
    });
    posthog.captureException(error, 'system', {
      route: 'DELETE /api/sites/id/[siteId]/files',
      client_type,
      client_version,
    });
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to delete files' },
      { status: 500 },
    );
  } finally {
    await Promise.all([posthog.shutdown(), flushLogs()]);
  }
}
