import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { validateCliToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

/**
 * GET /api/cli/site/:projectName
 * Get details for a specific site by project name
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ projectName: string }> },
) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'GET /api/cli/site/:projectName',
    },
    async (span) => {
      try {
        // Validate CLI token
        const auth = await validateCliToken(request);
        if (!auth?.userId) {
          return NextResponse.json(
            { error: 'unauthorized', message: 'Not authenticated' },
            { status: 401 },
          );
        }

        const { projectName } = await props.params;

        // Sanitize project name (alphanumeric, hyphens, underscores only)
        // as this value would be used for site creation
        const sanitizedName = projectName
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-');
        if (sanitizedName.length < 1 || sanitizedName.length > 100) {
          return NextResponse.json(
            {
              error: 'invalid_project_name',
              message: 'Project name must be 1-100 characters',
            },
            { status: 400 },
          );
        }

        span.setAttribute('projectName', sanitizedName);
        span.setAttribute('userId', auth.userId);

        // Fetch site by project name and user ID
        const site = await prisma.site.findFirst({
          where: {
            projectName: sanitizedName,
            userId: auth.userId,
          },
          select: {
            id: true,
            projectName: true,
            ghRepository: true,
            ghBranch: true,
            customDomain: true,
            rootDir: true,
            plan: true,
            privacyMode: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            user: {
              select: {
                username: true,
                ghUsername: true,
              },
            },
            _count: {
              select: { blobs: true },
            },
            blobs: {
              select: {
                size: true,
              },
            },
          },
        });

        if (!site) {
          return NextResponse.json(
            { error: 'not_found', message: 'Site not found' },
            { status: 404 },
          );
        }

        // Check ownership
        if (site.userId !== auth.userId) {
          return NextResponse.json(
            {
              error: 'forbidden',
              message: 'You do not have access to this site',
            },
            { status: 403 },
          );
        }

        // Calculate total size
        const totalSize = site.blobs.reduce((sum, blob) => sum + blob.size, 0);
        const username = site.user.username || site.user.ghUsername;

        // Determine site URL
        let siteUrl: string;
        if (site.customDomain) {
          siteUrl = `https://${site.customDomain}`;
        } else {
          siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
        }

        return NextResponse.json({
          site: {
            id: site.id,
            projectName: site.projectName,
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch,
            customDomain: site.customDomain,
            rootDir: site.rootDir,
            plan: site.plan,
            url: siteUrl,
            fileCount: site._count.blobs,
            totalSize,
            updatedAt: site.updatedAt.toISOString(),
            createdAt: site.createdAt.toISOString(),
          },
        });
      } catch (error) {
        console.error('Error fetching site by project name:', error);
        Sentry.captureException(error);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to fetch site' },
          { status: 500 },
        );
      }
    },
  );
}
