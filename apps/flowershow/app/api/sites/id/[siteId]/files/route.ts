import {
  DeleteFilesRequestSchema,
  type DeleteFilesResponse,
  PublishFilesRequestSchema,
  type PublishFilesResponse,
  type UploadTarget,
} from '@flowershow/api-contract';
import { Prisma, PublishSource } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { deleteBlobs } from '@/lib/blob-cleanup';
import { getClientInfo, validateAccessToken } from '@/lib/cli-auth';
import {
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import PostHogClient from '@/lib/server-posthog';
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

function clientTypeToPublishSource(
  clientType: 'cli' | 'obsidian-plugin' | 'unknown',
): PublishSource {
  if (clientType === 'cli') return PublishSource.cli;
  if (clientType === 'obsidian-plugin') return PublishSource.obsidian_plugin;
  return PublishSource.dashboard_upload;
}

/**
 * POST /api/sites/id/:siteId/files
 * Publish specific files without affecting other files
 * Returns presigned URLs for uploading the specified files
 *
 * Use this endpoint when you want to publish only selected files,
 * as opposed to the /sync endpoint which syncs the entire state.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
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
      },
    });

    let uploadUrls: UploadTarget[];
    try {
      const presignedUrlExpiresAt = new Date(
        Date.now() + PRESIGNED_URL_TTL * 1000,
      );

      uploadUrls = await Promise.all(
        files.map(async (file) => {
          const extension = file.path.split('.').pop()?.toLowerCase() ?? '';

          const urlPath = (() => {
            if (['md', 'mdx'].includes(extension)) {
              const _urlPath = resolveFilePathToUrlPath({ target: file.path });
              // TODO dirty, temporary patch; instead, make sure all appPaths in the db start with / (currently only root is / )
              return _urlPath === '/' ? _urlPath : _urlPath.replace(/^\//, '');
            }
            return null;
          })();

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
            update: {
              size: file.size,
              sha: file.sha,
              appPath: urlPath,
              extension,
            },
          });

          const s3Key = `${siteId}/main/raw/${publish.id}/${file.path}`;
          const contentType = getContentType(extension);
          const uploadUrl = await generatePresignedUploadUrl(
            s3Key,
            PRESIGNED_URL_TTL,
            contentType,
          );

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

          return { path: file.path, uploadUrl, blobId: blob.id, contentType };
        }),
      );
    } finally {
      revalidateTag(siteId);
    }

    const response: PublishFilesResponse = {
      files: uploadUrls,
      publishId: publish.id,
    };

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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error publishing files:', error);
    const posthog = PostHogClient();
    const { client_type, client_version } = getClientInfo(request);
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/id/[siteId]/files',
      client_type,
      client_version,
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to publish files' },
      { status: 500 },
    );
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
  try {
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
      select: { id: true, path: true },
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

    if (existingBlobs.length > 0) {
      try {
        await deleteBlobs(siteId, existingBlobs);
      } finally {
        revalidateTag(siteId);
      }
    }

    const response: DeleteFilesResponse = { deleted, notFound };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting files:', error);
    const posthog = PostHogClient();
    const { client_type, client_version } = getClientInfo(request);
    posthog.captureException(error, 'system', {
      route: 'DELETE /api/sites/id/[siteId]/files',
      client_type,
      client_version,
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to delete files' },
      { status: 500 },
    );
  }
}
