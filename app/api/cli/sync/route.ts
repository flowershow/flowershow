import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { validateCliToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

/**
 * POST /api/cli/sync
 *
 * Trigger a site sync from the CLI
 * Requires Bearer token authentication
 *
 * Request body:
 * {
 *   "siteId": "string",      // Required: Site ID to sync
 *   "force": boolean         // Optional: Force full sync (default: false)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Site sync triggered",
 *   "siteId": "string"
 * }
 */
export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/cli/sync',
    },
    async (span) => {
      try {
        // Validate CLI token
        const authResult = await validateCliToken(request);

        if (!authResult) {
          Sentry.logger.warn('Unauthorized CLI sync attempt', {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          });

          return NextResponse.json(
            {
              error: 'unauthorized',
              error_description: 'Invalid or missing authentication token',
            },
            { status: 401 },
          );
        }

        const { userId } = authResult;
        span.setAttribute('user.id', userId);

        // Parse request body
        let body: { siteId?: string; force?: boolean };
        try {
          body = await request.json();
        } catch (error) {
          Sentry.logger.error('Failed to parse request body', { error });
          return NextResponse.json(
            {
              error: 'invalid_request',
              error_description: 'Invalid JSON in request body',
            },
            { status: 400 },
          );
        }

        const { siteId, force = false } = body;

        // Validate siteId
        if (!siteId || typeof siteId !== 'string') {
          return NextResponse.json(
            {
              error: 'invalid_request',
              error_description: 'siteId is required and must be a string',
            },
            { status: 400 },
          );
        }

        span.setAttribute('site.id', siteId);
        span.setAttribute('sync.force', force);

        // Fetch site and verify ownership
        const site = await prisma.site.findUnique({
          where: { id: siteId },
          include: {
            user: {
              select: {
                id: true,
                ghUsername: true,
              },
            },
          },
        });

        if (!site) {
          Sentry.logger.warn('Site not found', { siteId, userId });
          return NextResponse.json(
            {
              error: 'not_found',
              error_description: 'Site not found',
            },
            { status: 404 },
          );
        }

        // Verify user owns the site
        if (site.userId !== userId) {
          Sentry.logger.warn('User does not own site', {
            siteId,
            userId,
            siteOwnerId: site.userId,
          });

          return NextResponse.json(
            {
              error: 'forbidden',
              error_description: 'You do not have permission to sync this site',
            },
            { status: 403 },
          );
        }

        // Get access token for GitHub API
        const account = await prisma.account.findFirst({
          where: {
            userId,
            provider: 'github',
          },
          select: {
            access_token: true,
          },
        });

        if (!account?.access_token) {
          Sentry.logger.error('GitHub access token not found', { userId });
          return NextResponse.json(
            {
              error: 'configuration_error',
              error_description:
                'GitHub access token not found. Please reconnect your GitHub account.',
            },
            { status: 500 },
          );
        }

        // Trigger sync via Inngest
        await inngest.send({
          name: 'site/sync',
          data: {
            siteId: site.id,
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch,
            rootDir: site.rootDir,
            accessToken: account.access_token,
            forceSync: force,
          },
        });

        Sentry.logger.info('Site sync triggered from CLI', {
          siteId: site.id,
          userId,
          force,
          repository: site.ghRepository,
          branch: site.ghBranch,
        });

        return NextResponse.json({
          success: true,
          message: 'Site sync triggered successfully',
          siteId: site.id,
          projectName: site.projectName,
          repository: site.ghRepository,
          branch: site.ghBranch,
        });
      } catch (error) {
        Sentry.captureException(error);
        Sentry.logger.error('Error in CLI sync endpoint', { error });

        return NextResponse.json(
          {
            error: 'internal_error',
            error_description:
              'An unexpected error occurred while processing the sync request',
          },
          { status: 500 },
        );
      }
    },
  );
}
