import { Blob } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { checkCliVersion, validateAccessToken } from '@/lib/cli-auth';
import {
  deleteFile,
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
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
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/sites/id/[siteId]/sync',
    },
    async () => {
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

        // Check for dry-run mode
        const searchParams = request.nextUrl.searchParams;
        const dryRun = searchParams.get('dryRun') === 'true';

        // Parse request body
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

        // Fetch all existing blobs for this site
        const existingBlobs = (await prisma.blob.findMany({
          where: { siteId },
          select: {
            id: true,
            path: true,
            sha: true,
          },
        })) as Blob[];

        // Create maps for efficient lookup
        const existingBlobMap = new Map(
          existingBlobs.map((blob) => [blob.path, blob]),
        );
        const localFileMap = new Map(files.map((file) => [file.path, file]));

        // Categorize files
        const toUpload: FileMetadata[] = [];
        const toUpdate: FileMetadata[] = [];
        const unchanged: string[] = [];
        const toDelete: Array<{ id: string; path: string }> = [];

        // Check each local file
        for (const file of files) {
          const existingBlob = existingBlobMap.get(file.path);

          if (!existingBlob) {
            // New file
            toUpload.push(file);
          } else if (existingBlob.sha !== file.sha) {
            // Modified file (different SHA)
            toUpdate.push(file);
          } else {
            // Unchanged file (same SHA)
            unchanged.push(file.path);
          }
        }

        // Find files to delete (exist in DB but not in local files)
        for (const existingBlob of existingBlobs) {
          if (!localFileMap.has(existingBlob.path)) {
            toDelete.push({
              id: existingBlob.id,
              path: existingBlob.path,
            });
          }
        }

        // Delete files from R2 and database
        const deletedPaths: string[] = [];
        if (toDelete.length > 0 && !dryRun) {
          await Sentry.startSpan(
            {
              op: 'db.delete',
              name: 'Delete files from R2 and database',
            },
            async (span) => {
              span.setAttribute('files_to_delete', toDelete.length);

              // Delete from R2 storage
              await Promise.all(
                toDelete.map(async (file) => {
                  try {
                    await deleteFile({
                      projectId: siteId,
                      path: file.path,
                    });
                    deletedPaths.push(file.path);
                  } catch (error) {
                    Sentry.captureException(error, {
                      extra: {
                        siteId,
                        filePath: file.path,
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
                    in: toDelete.map((f) => f.id),
                  },
                },
              });
            },
          );
        } else if (toDelete.length > 0 && dryRun) {
          // In dry-run mode, just list what would be deleted
          deletedPaths.push(...toDelete.map((f) => f.path));
        }

        // Helper function to generate presigned URLs for a list of files
        const generateUrlsForFiles = async (
          files: FileMetadata[],
        ): Promise<UploadUrl[]> => {
          return Promise.all(
            files.map(async (file) => {
              // Extract file extension
              const extension = file.path.split('.').pop()?.toLowerCase() || '';

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
        };

        // Helper function to generate placeholder data for dry-run mode
        const generateDryRunPlaceholders = (
          files: FileMetadata[],
        ): UploadUrl[] => {
          return files.map((file) => {
            const extension = file.path.split('.').pop()?.toLowerCase() || '';
            return {
              path: file.path,
              uploadUrl: '',
              blobId: '',
              contentType: getContentType(extension),
            };
          });
        };

        // Generate presigned URLs for files to upload and update
        const [uploadUrls, updateUrls] = dryRun
          ? [
              generateDryRunPlaceholders(toUpload),
              generateDryRunPlaceholders(toUpdate),
            ]
          : await Sentry.startSpan(
              {
                op: 'http.client',
                name: 'Generate presigned URLs',
              },
              async (span) => {
                span.setAttribute('files_to_upload', toUpload.length);
                span.setAttribute('files_to_update', toUpdate.length);

                return Promise.all([
                  generateUrlsForFiles(toUpload),
                  generateUrlsForFiles(toUpdate),
                ]);
              },
            );

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
        };

        return NextResponse.json(response);
      } catch (error) {
        console.error('Error syncing files:', error);
        Sentry.captureException(error);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to sync files' },
          { status: 500 },
        );
      }
    },
  );
}
