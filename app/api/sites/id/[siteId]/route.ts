import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/lib/cli-auth';
import { deleteProject } from '@/lib/content-store';
import prisma from '@/server/db';

/**
 * GET /api/site/:siteId
 * Get details for a specific site
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching site:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch site' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/site/:siteId
 * Delete a site and all its content
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
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
      Sentry.captureException(storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database (cascades to blobs)
    await prisma.site.delete({
      where: { id: siteId },
    });

    return NextResponse.json({
      success: true,
      message: 'Site deleted successfully',
      deletedFiles,
    });
  } catch (error) {
    console.error('Error deleting site:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to delete site' },
      { status: 500 },
    );
  }
}
