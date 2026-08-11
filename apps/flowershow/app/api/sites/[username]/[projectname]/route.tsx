import { NextRequest, NextResponse } from 'next/server';
import { InternalSite, internalSiteSelect } from '@/lib/db/internal';
import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';

export async function GET(
  req: NextRequest,
  props: {
    params: Promise<{
      username: string;
      projectname: string;
    }>;
  },
) {
  const params = await props.params;
  const { username, projectname } = params;

  // [DEBUG-e2e500] Temporary CI instrumentation — REMOVE after diagnosing the
  // free-site `_subdomain` 500. Surfaces the otherwise-suppressed error + the
  // query outcome so both next-dev.log and the Playwright response body show it.
  try {
    console.log(
      `[DEBUG-e2e500] enter username=${username} projectname=${projectname}`,
    );

    // Check for optional authentication
    const auth = await validateAccessToken(req).catch(() => null);

    let site: InternalSite | null = null;

    if (username === '_domain') {
      site = await prisma.site.findUnique({
        where: {
          customDomain: projectname,
        },
        select: internalSiteSelect,
      });
    } else if (username === '_subdomain') {
      site = await prisma.site.findUnique({
        where: {
          subdomain: projectname,
        },
        select: internalSiteSelect,
      });
    } else if (username === 'anon') {
      site = await prisma.site.findFirst({
        where: {
          projectName: projectname,
          userId: ANONYMOUS_USER_ID,
        },
        select: internalSiteSelect,
      });
    } else {
      site = await prisma.site.findFirst({
        where: {
          user: {
            username,
          },
          projectName: projectname,
        },
        select: internalSiteSelect,
      });
    }

    if (!site) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // [DEBUG-e2e500]
    console.log(
      `[DEBUG-e2e500] found site=${site.id} user=${
        (site as InternalSite).user ? site.user.username : 'NO-USER-RELATION'
      }`,
    );

    // If authenticated and user owns the site, return extended data for CLI usage
    if (auth?.userId && site.user.id === auth.userId) {
      const extendedSite = await prisma.site.findUnique({
        where: { id: site.id },
        select: {
          id: true,
          projectName: true,
          ghRepository: true,
          ghBranch: true,
          customDomain: true,
          subdomain: true,
          rootDir: true,
          plan: true,
          privacyMode: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          user: {
            select: {
              username: true,
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

      if (extendedSite) {
        const totalSize = extendedSite.blobs.reduce(
          (sum, blob) => sum + blob.size,
          0,
        );

        const siteUrl = extendedSite.customDomain
          ? `https://${extendedSite.customDomain}`
          : `https://${extendedSite.subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN}`;

        return NextResponse.json({
          site: {
            id: extendedSite.id,
            projectName: extendedSite.projectName,
            ghRepository: extendedSite.ghRepository,
            ghBranch: extendedSite.ghBranch,
            customDomain: extendedSite.customDomain,
            subdomain: extendedSite.subdomain,
            rootDir: extendedSite.rootDir,
            plan: extendedSite.plan,
            url: siteUrl,
            fileCount: extendedSite._count.blobs,
            totalSize,
            updatedAt: extendedSite.updatedAt.toISOString(),
            createdAt: extendedSite.createdAt.toISOString(),
          },
        });
      }
    }

    // Anyone who knows a site's public hostname can reach this unauthenticated,
    // so return only the fields the middleware needs — never internal metadata.
    return NextResponse.json({
      id: site.id,
      subdomain: site.subdomain,
      customDomain: site.customDomain,
      projectName: site.projectName,
      privacyMode: site.privacyMode,
      tokenVersion: site.tokenVersion,
      user: { username: site.user.username },
    });
  } catch (err) {
    // [DEBUG-e2e500] Temporary — REMOVE after diagnosis.
    console.error('[DEBUG-e2e500] route threw:', err);
    return NextResponse.json(
      {
        error: 'debug-e2e500',
        message: String(err),
        name: err instanceof Error ? err.name : null,
        stack: err instanceof Error ? err.stack : null,
      },
      { status: 500 },
    );
  }
}
