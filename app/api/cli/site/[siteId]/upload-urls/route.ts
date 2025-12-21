import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { validateCliToken } from '@/lib/cli-auth';
import { generatePresignedUploadUrl } from '@/lib/content-store';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import prisma from '@/server/db';

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;
// Maximum total upload size: 500MB
const MAX_TOTAL_SIZE = 500 * 1024 * 1024;
// Maximum number of files per request
const MAX_FILES = 1000;

interface FileUploadRequest {
  path: string;
  size: number;
  sha: string;
}

/**
 * POST /api/cli/site/:siteId/upload-urls
 * Generate presigned URLs for uploading files directly to R2
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    // Validate CLI token
    const auth = await validateCliToken(request);
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
        { error: 'forbidden', message: 'You do not have access to this site' },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { files } = body as { files: FileUploadRequest[] };

    if (!Array.isArray(files) || files.length === 0) {
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
      if (!file.path || !file.size || !file.sha) {
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

    // Generate presigned URLs and create blob records
    const uploadUrls = await Promise.all(
      files.map(async (file) => {
        // Extract file extension
        const extension = file.path.split('.').pop()?.toLowerCase() || '';

        const urlPath = (() => {
          if (['md', 'mdx'].includes(extension)) {
            const _urlPath = resolveFilePathToUrlPath({
              target: file.path,
            });
            // TODO dirty, temporary patch; instead, make sure all appPaths in the db start with / (currently only root is / 🤦‍♀️)
            return _urlPath === '/' ? _urlPath : _urlPath.replace(/^\//, '');
          } else {
            return null;
          }
        })();

        // Create blob record with UPLOADING status
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
            syncStatus: ['md', 'mdx'].includes(extension)
              ? 'PENDING'
              : 'SUCCESS',
          },
          update: {
            size: file.size || 0,
            sha: file.sha,
          },
        });
        // await prisma.blob.create({
        //   data: {
        //     siteId,
        //     path: file.path,
        //     size: file.size,
        //     sha: file.sha,
        //     extension,
        //     syncStatus: 'PENDING', // Will be set to PENDING initially
        //     metadata: {},
        //   },
        // });

        // Generate S3 key: siteId/main/raw/path
        const s3Key = `${siteId}/main/raw/${file.path}`;

        // Generate presigned URL (valid for 1 hour)
        const uploadUrl = await generatePresignedUploadUrl(s3Key, 3600);

        return {
          path: file.path,
          uploadUrl,
          blobId: blob.id,
        };
      }),
    );

    return NextResponse.json({
      uploadUrls,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating upload URLs:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to generate upload URLs' },
      { status: 500 },
    );
  }
}
