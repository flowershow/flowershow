import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import PostHogClient from '@/lib/server-posthog';
import { authOptions } from '@/server/auth';
import prisma from '@/server/db';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 100; // Allow more files for authenticated users

interface FileInfo {
  fileName: string;
  fileSize: number;
  sha: string;
}

interface PublishRequest {
  projectName?: string;
  files: FileInfo[];
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
}

/**
 * POST /api/publish
 * Create a new site for authenticated users and return presigned upload URLs
 */
export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/publish',
    },
    async (span) => {
      try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 },
          );
        }

        const userId = session.user.id;
        span.setAttribute('user_id', userId);

        // Get user's username for URL generation
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });

        if (!user?.username) {
          return NextResponse.json(
            { error: 'Username is required. Please set a username first.' },
            { status: 400 },
          );
        }

        // Parse request
        const body = (await request.json()) as PublishRequest;
        const { files, projectName: requestedProjectName } = body;

        // Validate files array
        if (!files || !Array.isArray(files) || files.length === 0) {
          return NextResponse.json(
            { error: 'At least one file is required' },
            { status: 400 },
          );
        }

        if (files.length > MAX_FILES) {
          return NextResponse.json(
            { error: `Maximum ${MAX_FILES} files allowed` },
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
                error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
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

        // Generate or sanitize project name
        let projectName: string;
        if (requestedProjectName) {
          projectName = requestedProjectName
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '-')
            .substring(0, 100);
        } else {
          // Generate a random project name
          projectName = Math.random().toString(36).substring(2, 10);
        }

        // Check if site already exists for this user
        const existingSite = await prisma.site.findFirst({
          where: {
            userId,
            projectName,
          },
        });

        if (existingSite) {
          return NextResponse.json(
            {
              error: `A site named '${projectName}' already exists. Choose a different name or delete the existing site.`,
            },
            { status: 409 },
          );
        }

        // Create new site
        const site = await prisma.site.create({
          data: {
            projectName,
            userId,
            autoSync: false,
          },
        });

        span.setAttribute('site_id', site.id);

        // Create blob records and generate upload URLs for all files
        const fileUploads: FileUploadInfo[] = [];
        const markdownFiles = files.filter((f) =>
          markdownExtensions.includes(
            f.fileName.split('.').pop()?.toLowerCase() || '',
          ),
        );

        for (const file of files) {
          const extension = file.fileName.split('.').pop()?.toLowerCase()!;
          const isMarkdown = markdownExtensions.includes(extension);

          // Determine appPath: only for markdown files
          let appPath: string | null = null;
          if (isMarkdown) {
            if (markdownFiles.length === 1) {
              // Single markdown file always goes to root
              appPath = '/';
            } else {
              // Use the resolve function for multiple files
              const urlPath = resolveFilePathToUrlPath({
                target: file.fileName,
              });
              appPath = urlPath === '/' ? urlPath : urlPath.replace(/^\//, '');
            }
          }

          await prisma.blob.create({
            data: {
              siteId: site.id,
              path: file.fileName,
              appPath,
              size: file.fileSize,
              sha: file.sha,
              metadata: {},
              extension,
              syncStatus: isMarkdown ? 'PENDING' : 'SUCCESS',
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
        const liveUrl = `/@${user.username}/${projectName}`;

        // Track analytics
        const posthog = PostHogClient();
        posthog.capture({
          distinctId: userId,
          event: 'file_publish_started',
          properties: {
            site_id: site.id,
            file_count: files.length,
            total_size: totalSize,
            referrer: request.headers.get('referer') || 'direct',
          },
        });
        await posthog.shutdown();

        const response: PublishResponse = {
          siteId: site.id,
          projectName,
          files: fileUploads,
          liveUrl,
        };

        return NextResponse.json(response, { status: 201 });
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
