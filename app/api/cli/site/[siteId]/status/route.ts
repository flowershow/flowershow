import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { validateCliToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

/**
 * GET /api/cli/site/:siteId/status
 * Get processing status of site files
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    // Validate CLI token
    const auth = await validateCliToken(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { siteId } = await props.params;

    // Verify site exists and user owns it
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'not_found', message: 'Site not found' },
        { status: 404 },
      );
    }

    if (site.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You do not have access to this site' },
        { status: 403 },
      );
    }

    // Get all blobs for this site with their status
    const blobs = await prisma.blob.findMany({
      where: { siteId },
      select: {
        id: true,
        path: true,
        extension: true,
        syncStatus: true,
        syncError: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Count files by status
    const statusCounts = {
      total: blobs.length,
      pending: 0,
      success: 0,
      failed: 0,
    };

    for (const blob of blobs) {
      switch (blob.syncStatus) {
        case 'PENDING':
          statusCounts.pending++;
          break;
        case 'SUCCESS':
          statusCounts.success++;
          break;
        case 'ERROR':
          statusCounts.failed++;
          break;
      }
    }

    // Determine overall status
    let overallStatus: 'processing' | 'complete' | 'error';
    if (statusCounts.failed > 0) {
      overallStatus = 'error';
    } else if (statusCounts.pending > 0) {
      overallStatus = 'processing';
    } else {
      overallStatus = 'complete';
    }

    return NextResponse.json({
      siteId,
      status: overallStatus,
      files: statusCounts,
      blobs: blobs.map((blob) => ({
        id: blob.id,
        path: blob.path,
        syncStatus: blob.syncStatus,
        syncError: blob.syncError,
        extension: blob.extension,
      })),
    });
  } catch (error) {
    console.error('Error fetching site status:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch site status' },
      { status: 500 },
    );
  }
}
