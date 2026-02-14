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

      let siteUrl: string;
      if (extendedSite.customDomain) {
        siteUrl = `https://${extendedSite.customDomain}`;
      } else {
        siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${extendedSite.user.username}/${extendedSite.projectName}`;
      }

      return NextResponse.json({
        site: {
          id: extendedSite.id,
          projectName: extendedSite.projectName,
          ghRepository: extendedSite.ghRepository,
          ghBranch: extendedSite.ghBranch,
          customDomain: extendedSite.customDomain,
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

  return NextResponse.json(site);
}
