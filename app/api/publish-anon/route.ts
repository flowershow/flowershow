import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import {
  ANONYMOUS_USER_ID,
  generateOwnershipToken,
  isValidAnonymousUserId,
} from '@/lib/anonymous-user';
import {
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 5;

interface FileInfo {
  fileName: string;
  fileSize: number;
  sha: string;
}

interface PublishRequest {
  files: FileInfo[];
  anonymousUserId: string; // Client-generated persistent ID
}

interface FileUploadInfo {
  fileName: string;
  uploadUrl: string;
}

interface PublishResponse {
  siteId: string;
  projectName: string;
  files: FileUploadInfo[];
  liveUrl: string;
  ownershipToken: string;
}

/**
 * POST /api/publish-anon
 * Create anonymous site and return presigned upload URL
 */
export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/publish-anon',
    },
    async (span) => {
      try {
        // Rate limiting
        const clientIp = getClientIp(request.headers);
        if (!checkRateLimit(clientIp, 10, 3600000)) {
          span.setAttribute('rate_limited', true);
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429 },
          );
        }

        // Parse request
        const body = (await request.json()) as PublishRequest;
        const { files, anonymousUserId } = body;

        // Validate anonymousUserId
        if (!anonymousUserId || !isValidAnonymousUserId(anonymousUserId)) {
          return NextResponse.json(
            { error: 'Valid anonymousUserId is required' },
            { status: 400 },
          );
        }

        // Validate files array
        if (!files || !Array.isArray(files) || files.length === 0) {
          return NextResponse.json(
            { error: 'At least one file is required' },
            { status: 400 },
          );
        }

        if (files.length > MAX_FILES) {
          return NextResponse.json(
            {
              error: `Maximum ${MAX_FILES} files allowed. Sign in to publish more.`,
            },
            { status: 400 },
          );
        }

        // Validate each file
        const markdownExtensions = ['md', 'mdx'];
        let totalSize = 0;
        let hasMarkdownFile = false;

        for (const file of files) {
          if (!file.fileName || typeof file.fileName !== 'string') {
            return NextResponse.json(
              { error: 'fileName is required for each file' },
              { status: 400 },
            );
          }

          const extension = file.fileName.split('.').pop()?.toLowerCase();
          if (!extension) {
            return NextResponse.json(
              { error: 'File must have an extension' },
              { status: 400 },
            );
          }

          if (markdownExtensions.includes(extension)) {
            hasMarkdownFile = true;
          }

          if (
            !file.fileSize ||
            typeof file.fileSize !== 'number' ||
            file.fileSize <= 0
          ) {
            return NextResponse.json(
              { error: 'Invalid file size' },
              { status: 400 },
            );
          }

          if (file.fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
              {
                error: `File too large. Maximum size is ${
                  MAX_FILE_SIZE / 1024 / 1024
                }MB`,
              },
              { status: 400 },
            );
          }

          if (!file.sha || typeof file.sha !== 'string') {
            return NextResponse.json(
              { error: 'sha is required for each file' },
              { status: 400 },
            );
          }

          totalSize += file.fileSize;
        }

        // Require at least one markdown file
        if (!hasMarkdownFile) {
          return NextResponse.json(
            { error: 'At least one markdown file (.md, .mdx) is required' },
            { status: 400 },
          );
        }

        span.setAttribute('file_count', files.length);
        span.setAttribute('total_size', totalSize);

        // Check if there's only a single markdown file
        const mdFiles = files.filter((f) => {
          const ext = f.fileName.split('.').pop()?.toLowerCase() || '';
          return ['md', 'mdx'].includes(ext);
        });
        const isSinglePage = mdFiles.length === 1;

        // Generate unique project name
        const randomPart = Math.random().toString(36).substring(2, 10);
        const projectName = randomPart;

        // Create anonymous site with client's persistent anonymous user ID
        // Temporary sites expire in 7 days if not claimed
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const site = await prisma.site.create({
          data: {
            projectName,
            userId: ANONYMOUS_USER_ID,
            anonymousOwnerId: anonymousUserId,
            isTemporary: true,
            expiresAt,
          },
        });

        span.setAttribute('site_id', site.id);

        // Create blob records and generate upload URLs for all files
        const fileUploads: FileUploadInfo[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i]!;
          const extension = file.fileName.split('.').pop()?.toLowerCase()!;

          const appPath = (() => {
            if (['md', 'mdx'].includes(extension)) {
              if (isSinglePage) {
                return '/';
              }
              const _urlPath = resolveFilePathToUrlPath({
                target: file.fileName,
              });
              // TODO dirty, temporary patch; instead, make sure all appPaths in the db start with / (currently only root is / 🤦‍♀️)
              return _urlPath === '/' ? _urlPath : _urlPath.replace(/^\//, '');
            } else {
              return null;
            }
          })();

          await prisma.blob.create({
            data: {
              siteId: site.id,
              path: file.fileName,
              appPath,
              size: file.fileSize,
              sha: file.sha,
              metadata: {},
              extension,
              syncStatus: 'UPLOADING',
            },
          });

          // Generate presigned upload URL
          const s3Key = `${site.id}/main/raw/${file.fileName}`;
          const contentType = getContentType(extension);
          const uploadUrl = await generatePresignedUploadUrl(
            s3Key,
            3600, // 1 hour expiry
            contentType,
          );

          fileUploads.push({
            fileName: file.fileName,
            uploadUrl,
          });
        }

        // Construct live URL
        const liveUrl = `/@anon/${projectName}`;

        // Track analytics
        const posthog = PostHogClient();
        posthog.capture({
          distinctId: site.id,
          event: 'anon_publish_started',
          properties: {
            site_id: site.id,
            file_count: files.length,
            total_size: totalSize,
            referrer: request.headers.get('referer') || 'direct',
            is_authenticated: false,
          },
        });
        await posthog.shutdown();

        // Generate ownership token for claiming later
        // Token is reusable across all sites for this browser
        const ownershipToken = generateOwnershipToken(anonymousUserId);

        const response: PublishResponse = {
          siteId: site.id,
          projectName,
          files: fileUploads,
          liveUrl,
          ownershipToken,
        };

        return NextResponse.json(response);
      } catch (error) {
        console.error('Publish error:', error);
        Sentry.captureException(error);

        return NextResponse.json(
          { error: 'Failed to create site. Please try again.' },
          { status: 500 },
        );
      }
    },
  );
}
