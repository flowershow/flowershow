import { NextRequest, NextResponse } from 'next/server';
import {
  canManageSite,
  siteAuthzSelect,
  type SiteAuthzFields,
} from '@/lib/site-authz';
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

  // Signed-in callers also load their own membership (filtered to them), so
  // owners and Premium editors get the extended data below.
  const select = auth?.userId
    ? { ...internalSiteSelect, ...siteAuthzSelect(auth.userId) }
    : internalSiteSelect;

  // `userId` and `members` are only loaded for a signed-in caller.
  let site: (InternalSite & Partial<SiteAuthzFields>) | null = null;

  if (username === '_domain') {
    site = await prisma.site.findUnique({
      where: {
        customDomain: projectname,
      },
      select,
    });
  } else if (username === '_subdomain') {
    site = await prisma.site.findUnique({
      where: {
        subdomain: projectname,
      },
      select,
    });
  } else if (username === 'anon') {
    site = await prisma.site.findFirst({
      where: {
        projectName: projectname,
        userId: ANONYMOUS_USER_ID,
      },
      select,
    });
  } else {
    site = await prisma.site.findFirst({
      where: {
        user: {
          username,
        },
        projectName: projectname,
      },
      select,
    });
  }

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Expired anonymous sites stop being served before the cleanup cron runs.
  // The middleware resolves *-anon subdomains through this lookup.
  if (site.isTemporary && site.expiresAt && site.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // If the caller may manage the site (owner or Premium editor), return
  // extended data for CLI usage.
  if (
    auth?.userId &&
    site.userId &&
    site.members &&
    canManageSite(auth.userId, {
      userId: site.userId,
      plan: site.plan,
      members: site.members,
    })
  ) {
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
    // Unclaimed anonymous site: the middleware adds abuse controls (flowershow-ctv).
    anonymous: site.user.id === ANONYMOUS_USER_ID,
  });
}
