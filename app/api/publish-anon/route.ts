import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import {
  generatePresignedUploadUrl,
  getContentType,
} from '@/lib/content-store';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import PostHogClient from '@/lib/server-posthog';
import {
  ANONYMOUS_USER_ID,
  generateOwnershipToken,
  isValidAnonymousUserId,
} from '@/lib/anonymous-user';
import prisma from '@/server/db';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface PublishRequest {
  fileName: string;
  fileSize: number;
  sha: string;
  anonymousUserId: string; // Client-generated persistent ID
}

interface PublishResponse {
  siteId: string;
  projectName: string;
  uploadUrl: string;
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
        const { fileName, fileSize, sha, anonymousUserId } = body;

        // Validate anonymousUserId
        if (!anonymousUserId || !isValidAnonymousUserId(anonymousUserId)) {
          return NextResponse.json(
            { error: 'Valid anonymousUserId is required' },
            { status: 400 },
          );
        }

        // Validate file name
        if (!fileName || typeof fileName !== 'string') {
          return NextResponse.json(
            { error: 'fileName is required' },
            { status: 400 },
          );
        }

        const extension = fileName.split('.').pop()?.toLowerCase();
        if (!extension || !['md', 'mdx', 'html'].includes(extension)) {
          return NextResponse.json(
            { error: 'Only .md, .mdx and .html files are supported' },
            { status: 400 },
          );
        }

        // Validate file size
        if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
          return NextResponse.json(
            { error: 'Invalid file size' },
            { status: 400 },
          );
        }

        if (fileSize > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              error: `File too large. Maximum size is ${
                MAX_FILE_SIZE / 1024 / 1024
              }MB`,
            },
            { status: 400 },
          );
        }

        // Validate SHA
        if (!sha || typeof sha !== 'string') {
          return NextResponse.json(
            { error: 'sha is required' },
            { status: 400 },
          );
        }

        span.setAttribute('file_size', fileSize);
        span.setAttribute('file_extension', extension);

        // Generate unique project name
        const randomPart = Math.random().toString(36).substring(2, 10);
        const projectName = randomPart;

        // Create anonymous site with client's persistent anonymous user ID
        const site = await prisma.site.create({
          data: {
            projectName,
            userId: ANONYMOUS_USER_ID,
            anonymousOwnerId: anonymousUserId,
          },
        });

        span.setAttribute('site_id', site.id);

        // Create blob record
        await prisma.blob.create({
          data: {
            siteId: site.id,
            path: fileName,
            appPath: '/', // always only single file site
            size: fileSize,
            sha,
            metadata: {},
            extension,
            syncStatus: 'PENDING',
          },
        });

        // Generate presigned upload URL
        const s3Key = `${site.id}/main/raw/${fileName}`;
        const contentType = getContentType(extension);
        const uploadUrl = await generatePresignedUploadUrl(
          s3Key,
          3600, // 1 hour expiry
          contentType,
        );

        // Construct live URL
        const liveUrl = `/@anon/${projectName}`;

        // Track analytics
        const posthog = PostHogClient();
        posthog.capture({
          distinctId: site.id,
          event: 'publish_started',
          properties: {
            site_id: site.id,
            file_size: fileSize,
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
          uploadUrl,
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
