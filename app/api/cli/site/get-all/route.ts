import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { validateCliToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

/**
 * GET /api/cli/site
 * Get all sites for the authenticated user
 */
export async function GET(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'GET /api/cli/site',
    },
    async () => {
      try {
        // Validate CLI token
        const auth = await validateCliToken(request);
        if (!auth?.userId) {
          return NextResponse.json(
            { error: 'unauthorized', message: 'Not authenticated' },
            { status: 401 },
          );
        }

        // Fetch all sites for the user
        const sites = await prisma.site.findMany({
          where: { userId: auth.userId },
          select: {
            id: true,
            projectName: true,
            ghRepository: true,
            ghBranch: true,
            subdomain: true,
            customDomain: true,
            rootDir: true,
            autoSync: true,
            plan: true,
            createdAt: true,
            updatedAt: true,
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
          orderBy: {
            updatedAt: 'desc',
          },
        });

        // Transform sites data
        const sitesData = sites.map((site) => {
          const totalSize = site.blobs.reduce(
            (sum, blob) => sum + blob.size,
            0,
          );
          const username = site.user.username || site.user.ghUsername;

          // Determine site URL
          let siteUrl: string;
          if (site.customDomain) {
            siteUrl = `https://${site.customDomain}`;
          } else {
            siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
          }

          return {
            id: site.id,
            projectName: site.projectName,
            ghRepository: site.ghRepository,
            ghBranch: site.ghBranch,
            customDomain: site.customDomain,
            rootDir: site.rootDir,
            autoSync: site.autoSync,
            plan: site.plan,
            url: siteUrl,
            fileCount: site._count.blobs,
            totalSize,
            updatedAt: site.updatedAt.toISOString(),
            createdAt: site.createdAt.toISOString(),
          };
        });

        return NextResponse.json({
          sites: sitesData,
          total: sitesData.length,
        });
      } catch (error) {
        console.error('Error fetching sites:', error);
        Sentry.captureException(error);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to fetch sites' },
          { status: 500 },
        );
      }
    },
  );
}
