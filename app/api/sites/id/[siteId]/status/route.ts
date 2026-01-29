import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

/**
 * GET /api/site/:siteId/status
 * Get processing status of site files
 *
 * When authenticated: Returns detailed blob information with individual file statuses
 * When unauthenticated: Returns simple ready/not-ready status (for public polling)
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    const { siteId } = await props.params;

    // Check for authentication (optional)
    const auth = await validateAccessToken(request);
    const isAuthenticated = !!auth?.userId;

    // If authenticated, verify ownership
    if (isAuthenticated) {
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
          {
            error: 'forbidden',
            message: 'You do not have access to this site',
          },
          { status: 403 },
        );
      }
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

    // Handle empty site
    if (blobs.length === 0) {
      if (isAuthenticated) {
        return NextResponse.json({
          siteId,
          status: 'pending',
          files: {
            total: 0,
            pending: 0,
            success: 0,
            failed: 0,
          },
          blobs: [],
        });
      } else {
        return NextResponse.json({
          status: 'pending',
          ready: false,
        });
      }
    }

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
    let overallStatus:
      | 'processing'
      | 'complete'
      | 'error'
      | 'pending'
      | 'success';
    if (statusCounts.failed > 0) {
      overallStatus = 'error';
    } else if (statusCounts.pending > 0) {
      overallStatus = 'processing';
    } else {
      overallStatus = 'complete';
    }

    // Return detailed response for authenticated requests
    if (isAuthenticated) {
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
    }

    // Return simple response for public polling
    const errorBlob = blobs.find((b) => b.syncStatus === 'ERROR');

    if (overallStatus === 'error') {
      return NextResponse.json({
        status: 'error',
        ready: false,
        error: errorBlob?.syncError || 'Processing failed',
      });
    }

    if (overallStatus === 'processing') {
      return NextResponse.json({
        status: 'processing',
        ready: false,
      });
    }

    // All blobs are SUCCESS
    return NextResponse.json({
      status: 'success',
      ready: true,
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
