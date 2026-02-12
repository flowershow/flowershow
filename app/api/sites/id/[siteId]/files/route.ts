import { Blob } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/lib/cli-auth';
import {
  deleteFile,
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import { ensureSiteCollection } from '@/lib/typesense';
import prisma from '@/server/db';

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;
// Maximum total upload size: 500MB
const MAX_TOTAL_SIZE = 500 * 1024 * 1024;
// Maximum number of files per request
const MAX_FILES = 1000;

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

interface PublishFilesResponse {
  files: UploadUrl[];
}

interface DeleteFilesResponse {
  deleted: string[];
  notFound: string[];
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
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/sites/id/[siteId]/files',
    },
    async () => {
      try {
        // Validate access token (CLI or PAT)
        const auth = await validateAccessToken(request);
        if (!auth?.userId) {
          return NextResponse.json(
            { error: 'unauthorized', message: 'Not authenticated' },
            { status: 401 },
          );
        }

        const { siteId } = await props.params;

        // Verify site exists and user owns it
        const site = await prisma.site.findUnique({
          where: { id: siteId },
          select: {
            id: true,
            userId: true,
          },
        });

        if (!site) {
          return NextResponse.json(
            { error: 'not_found', message: 'Site not found' },
            { status: 404 },
          );
        }

        if (site.userId !== auth.userId) {
          return NextResponse.json(
            {
              error: 'forbidden',
              message: 'You do not have access to this site',
            },
            { status: 403 },
          );
        }

        // Ensure Typesense collection exists for search indexing
        await ensureSiteCollection(siteId);

        // Parse request body
        const body = await request.json();
        const { files } = body as { files: FileMetadata[] };

        if (!Array.isArray(files)) {
          return NextResponse.json(
            { error: 'invalid_request', message: 'Files array is required' },
            { status: 400 },
          );
        }

        if (files.length === 0) {
          return NextResponse.json(
            {
              error: 'invalid_request',
              message: 'At least one file is required',
            },
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

        // Validate files
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
                message: `File ${file.path} exceeds maximum size of ${
                  MAX_FILE_SIZE / 1024 / 1024
                }MB`,
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
              message: `Total upload size exceeds maximum of ${
                MAX_TOTAL_SIZE / 1024 / 1024
              }MB`,
            },
            { status: 413 },
          );
        }

        // Generate presigned URLs for all files
        let uploadUrls: UploadUrl[];
        try {
          uploadUrls = await Sentry.startSpan(
            {
              op: 'http.client',
              name: 'Generate presigned URLs for files',
            },
            async (span) => {
              span.setAttribute('file_count', files.length);

              return Promise.all(
                files.map(async (file) => {
                  // Extract file extension
                  const extension =
                    file.path.split('.').pop()?.toLowerCase() || '';

                  const urlPath = (() => {
                    if (['md', 'mdx'].includes(extension)) {
                      const _urlPath = resolveFilePathToUrlPath({
                        target: file.path,
                      });
                      // TODO dirty, temporary patch; instead, make sure all appPaths in the db start with / (currently only root is / )
                      return _urlPath === '/'
                        ? _urlPath
                        : _urlPath.replace(/^\//, '');
                    } else {
                      return null;
                    }
                  })();

                  // Create or update blob record
                  const blob = await prisma.blob.upsert({
                    where: {
                      siteId_path: {
                        siteId,
                        path: file.path,
                      },
                    },
                    create: {
                      siteId,
                      path: file.path,
                      appPath: urlPath,
                      size: file.size,
                      sha: file.sha,
                      metadata: {},
                      extension,
                      syncStatus: 'UPLOADING',
                    },
                    update: {
                      size: file.size,
                      sha: file.sha,
                      appPath: urlPath,
                      extension,
                      syncStatus: 'UPLOADING',
                    },
                  });

                  // Generate S3 key: siteId/main/raw/path
                  const s3Key = `${siteId}/main/raw/${file.path}`;

                  // Get content type for the file
                  const contentType = getContentType(extension);

                  // Generate presigned URL (valid for 1 hour) with content type
                  const uploadUrl = await generatePresignedUploadUrl(
                    s3Key,
                    3600,
                    contentType,
                  );

                  return {
                    path: file.path,
                    uploadUrl,
                    blobId: blob.id,
                    contentType,
                  };
                }),
              );
            },
          );
        } finally {
          // Always invalidate cache, even on partial failures
          revalidateTag(siteId);
        }

        const response: PublishFilesResponse = {
          files: uploadUrls,
        };

        return NextResponse.json(response);
      } catch (error) {
        console.error('Error publishing files:', error);
        Sentry.captureException(error);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to publish files' },
          { status: 500 },
        );
      }
    },
  );
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
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'DELETE /api/sites/id/[siteId]/files',
    },
    async () => {
      try {
        // Validate access token (CLI or PAT)
        const auth = await validateAccessToken(request);
        if (!auth?.userId) {
          return NextResponse.json(
            { error: 'unauthorized', message: 'Not authenticated' },
            { status: 401 },
          );
        }

        const { siteId } = await props.params;

        // Verify site exists and user owns it
        const site = await prisma.site.findUnique({
          where: { id: siteId },
          select: {
            id: true,
            userId: true,
          },
        });

        if (!site) {
          return NextResponse.json(
            { error: 'not_found', message: 'Site not found' },
            { status: 404 },
          );
        }

        if (site.userId !== auth.userId) {
          return NextResponse.json(
            {
              error: 'forbidden',
              message: 'You do not have access to this site',
            },
            { status: 403 },
          );
        }

        // Parse request body
        const body = await request.json();
        const { paths } = body as { paths: string[] };

        if (!Array.isArray(paths)) {
          return NextResponse.json(
            { error: 'invalid_request', message: 'Paths array is required' },
            { status: 400 },
          );
        }

        if (paths.length === 0) {
          return NextResponse.json(
            {
              error: 'invalid_request',
              message: 'At least one path is required',
            },
            { status: 400 },
          );
        }

        if (paths.length > MAX_FILES) {
          return NextResponse.json(
            {
              error: 'payload_too_large',
              message: `Maximum ${MAX_FILES} files per request`,
            },
            { status: 413 },
          );
        }

        // Find existing blobs
        const existingBlobs = (await prisma.blob.findMany({
          where: {
            siteId,
            path: {
              in: paths,
            },
          },
          select: {
            id: true,
            path: true,
          },
        })) as Blob[];

        const existingPaths = new Set(existingBlobs.map((b) => b.path));
        const deleted: string[] = [];
        const notFound: string[] = [];

        // Identify which paths were found and which weren't
        for (const path of paths) {
          if (existingPaths.has(path)) {
            deleted.push(path);
          } else {
            notFound.push(path);
          }
        }

        // Delete files from R2 and database
        if (existingBlobs.length > 0) {
          try {
            await Sentry.startSpan(
              {
                op: 'db.delete',
                name: 'Delete files from R2 and database',
              },
              async (span) => {
                span.setAttribute('files_to_delete', existingBlobs.length);

                // Delete from R2 storage
                await Promise.all(
                  existingBlobs.map(async (blob) => {
                    try {
                      await deleteFile({
                        projectId: siteId,
                        path: blob.path,
                      });
                    } catch (error) {
                      Sentry.captureException(error, {
                        extra: {
                          siteId,
                          filePath: blob.path,
                          operation: 'delete_from_r2',
                        },
                      });
                      // Continue with other deletions even if one fails
                    }
                  }),
                );

                // Delete from database
                await prisma.blob.deleteMany({
                  where: {
                    id: {
                      in: existingBlobs.map((b) => b.id),
                    },
                  },
                });
              },
            );
          } finally {
            // Always invalidate cache, even on partial failures
            revalidateTag(siteId);
          }
        }

        const response: DeleteFilesResponse = {
          deleted,
          notFound,
        };

        return NextResponse.json(response);
      } catch (error) {
        console.error('Error deleting files:', error);
        Sentry.captureException(error);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to delete files' },
          { status: 500 },
        );
      }
    },
  );
}
