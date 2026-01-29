import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { checkCliVersion, validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

// ─── Response Types ──────────────────────────────────────────────────────────

/** Error response for API failures */
type ErrorResponse = {
  error: 'not_found' | 'forbidden' | 'internal_error';
  message: string;
};

/** File status counts */
type FileStatusCounts = {
  total: number;
  pending: number;
  success: number;
  failed: number;
};

/** Individual blob status info (authenticated response only) */
type BlobStatus = {
  id: string;
  path: string;
  syncStatus: string;
  syncError: string | null;
  extension: string | null;
};

/** Authenticated response with detailed blob information */
type AuthenticatedStatusResponse = {
  siteId: string;
  status: 'pending' | 'complete' | 'error';
  files: FileStatusCounts;
  blobs: BlobStatus[];
};

/** Public response for unauthenticated polling */
type PublicStatusResponse =
  | { status: 'pending' | 'complete' }
  | { status: 'error'; errors: Array<{ path: string; error: string }> };

/** All possible successful response types */
type StatusResponse = AuthenticatedStatusResponse | PublicStatusResponse;

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
        return NextResponse.json({ status: 'pending' });
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
    if (overallStatus === 'error') {
      const errors = blobs
        .filter((b) => b.syncStatus === 'ERROR')
        .map((b) => ({
          path: b.path,
          error: b.syncError || 'Processing failed',
        }));
      return NextResponse.json({ status: 'error', errors });
    }

    return NextResponse.json({ status: overallStatus });
  } catch (error) {
    console.error('Error fetching site status:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch site status' },
      { status: 500 },
    );
  }
}
