import type {
  DeleteSiteResponse,
  GetSiteResponse,
} from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { checkCliVersion, validateAccessToken } from '@/lib/cli-auth';
import { deleteProject } from '@/lib/content-store';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';

/**
 * GET /api/sites/id/:siteId
 * Get details for a specific site
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    // Check CLI version
    const versionError = checkCliVersion(request);
    if (versionError) return versionError;

    // Validate access token (CLI or PAT)
    const auth = await validateAccessToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { siteId } = await props.params;

    // Fetch site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        projectName: true,
        ghRepository: true,
        ghBranch: true,
        customDomain: true,
        rootDir: true,
        autoSync: true,
        plan: true,
        privacyMode: true,
        enableComments: true,
        enableSearch: true,
        syntaxMode: true,
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

    if (!site) {
      return NextResponse.json(
        { error: 'not_found', message: 'Site not found' },
        { status: 404 },
      );
    }

    // Check ownership
    if (site.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You do not have access to this site' },
        { status: 403 },
      );
    }

    // Calculate total size
    const totalSize = site.blobs.reduce((sum, blob) => sum + blob.size, 0);
    const username = site.user.username;

    // Determine site URL
    let siteUrl: string;
    if (site.customDomain) {
      siteUrl = `https://${site.customDomain}`;
    } else {
      siteUrl = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
    }

    const response: GetSiteResponse = {
      site: {
        id: site.id,
        projectName: site.projectName,
        ghRepository: site.ghRepository,
        ghBranch: site.ghBranch,
        customDomain: site.customDomain,
        rootDir: site.rootDir,
        autoSync: site.autoSync,
        plan: site.plan,
        privacyMode: site.privacyMode,
        enableComments: site.enableComments,
        enableSearch: site.enableSearch,
        syntaxMode: site.syntaxMode,
        url: siteUrl,
        fileCount: site._count.blobs,
        totalSize,
        updatedAt: site.updatedAt.toISOString(),
        createdAt: site.createdAt.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching site:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'GET /api/sites/id/[siteId]',
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch site' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sites/id/:siteId
 * Delete a site and all its content
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    // Check CLI version
    const versionError = checkCliVersion(request);
    if (versionError) return versionError;

    // Validate access token (CLI or PAT)
    const auth = await validateAccessToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { siteId } = await props.params;

    // Fetch site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        userId: true,
        _count: {
          select: { blobs: true },
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
        { error: 'forbidden', message: 'You do not have access to this site' },
        { status: 403 },
      );
    }

    const deletedFiles = site._count.blobs;

    // Delete from R2 storage
    try {
      await deleteProject(siteId);
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError);
      const posthog = PostHogClient();
      posthog.captureException(storageError, 'system', {
        route: 'DELETE /api/sites/id/[siteId]',
        siteId,
        operation: 'delete_from_r2',
      });
      await posthog.shutdown();
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database (cascades to blobs)
    await prisma.site.delete({
      where: { id: siteId },
    });

    const response: DeleteSiteResponse = {
      success: true,
      message: 'Site deleted successfully',
      deletedFiles,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting site:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'DELETE /api/sites/id/[siteId]',
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to delete site' },
      { status: 500 },
    );
  }
}
