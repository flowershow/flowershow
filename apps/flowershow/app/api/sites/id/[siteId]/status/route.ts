import type {
  BlobStatus,
  PublicStatusResponse,
  StatusResponse,
} from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { checkCliVersion, validateAccessToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';

/**
 * GET /api/sites/id/:siteId/status
 * Get processing status of site files
 *
 * @returns {ErrorResponse} - 404/403/500 error responses
 * @returns {AuthenticatedStatusResponse} - Detailed status when authenticated
 * @returns {PublicStatusResponse} - Simple ready/not-ready for public polling
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    // Check CLI version
    const versionError = checkCliVersion(request);
    if (versionError) return versionError;

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
        const response: StatusResponse = {
          siteId,
          status: 'pending',
          files: {
            total: 0,
            pending: 0,
            success: 0,
            failed: 0,
          },
          blobs: [],
        };
        return NextResponse.json(response);
      } else {
        return NextResponse.json({
          status: 'pending',
        } satisfies PublicStatusResponse);
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
        case 'UPLOADING':
        case 'PROCESSING':
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
    let overallStatus: 'pending' | 'complete' | 'error';
    if (statusCounts.failed > 0) {
      overallStatus = 'error';
    } else if (statusCounts.pending > 0) {
      overallStatus = 'pending';
    } else {
      overallStatus = 'complete';
    }

    // Return detailed response for authenticated requests
    if (isAuthenticated) {
      const response: StatusResponse = {
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
      };
      return NextResponse.json(response);
    }

    // Return simple response for public polling
    if (overallStatus === 'error') {
      const errors = blobs
        .filter((b) => b.syncStatus === 'ERROR')
        .map((b) => ({
          path: b.path,
          error: b.syncError || 'Processing failed',
        }));
      return NextResponse.json({
        status: 'error',
        errors,
      } satisfies PublicStatusResponse);
    }

    return NextResponse.json({
      status: overallStatus,
    } satisfies PublicStatusResponse);
  } catch (error) {
    console.error('Error fetching site status:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'GET /api/sites/id/[siteId]/status',
    });
    await posthog.shutdown();
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch site status' },
      { status: 500 },
    );
  }
}
