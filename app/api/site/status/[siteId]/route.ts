import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db';

/**
 * GET /api/publish/status/[siteId]
 * Check if a site's content has finished processing
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  try {
    const { siteId } = await props.params;

    // Get all blobs for this site
    const blobs = await prisma.blob.findMany({
      where: { siteId },
      select: {
        syncStatus: true,
        syncError: true,
      },
    });

    if (blobs.length === 0) {
      return NextResponse.json({
        status: 'pending',
        ready: false,
      });
    }

    // Check if any blobs are still pending
    const hasPending = blobs.some((b) => b.syncStatus === 'PENDING');
    const hasError = blobs.some((b) => b.syncStatus === 'ERROR');

    if (hasError) {
      const errorBlob = blobs.find((b) => b.syncStatus === 'ERROR');
      return NextResponse.json({
        status: 'error',
        ready: false,
        error: errorBlob?.syncError || 'Processing failed',
      });
    }

    if (hasPending) {
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
    console.error('Status check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        ready: false,
        error: 'Failed to check status',
      },
      { status: 500 },
    );
  }
}
