import type {
  PublishFileStatus,
  PublicStatusResponse,
  StatusResponse,
} from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { CLAIM_TOKEN_PREFIX } from '@/lib/anonymous-user';
import { checkCliVersion, validateAccessToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';
import { authorizeSiteRequest } from '@/lib/site-auth';
import prisma from '@/server/db';

/**
 * GET /api/sites/id/:siteId/status
 * Get processing status derived from the latest Publish record
 *
 * @returns {ErrorResponse} - 401/403/404/410/500 error responses
 * @returns {StatusResponse} - Detailed status when authenticated (owner token,
 *   or a site-scoped fs_claim_ token for an anonymous site)
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

    let isAuthenticated: boolean;
    let sitePrivacyMode: string | undefined;

    const authHeader = request.headers.get('authorization') ?? '';
    if (authHeader.startsWith(`Bearer ${CLAIM_TOKEN_PREFIX}`)) {
      // Site-scoped claim token (anonymous site): authorized for this site only
      const access = await authorizeSiteRequest(request, siteId);
      if (!access.ok) return access.response;
      isAuthenticated = true;
    } else {
      // Check for authentication (optional)
      const auth = await validateAccessToken(request);
      isAuthenticated = !!auth?.userId;

      // Fetch once: ownership check (when authenticated) and privacyMode, which
      // gates the public error branch below so PASSWORD sites don't leak file
      // paths / error detail to anonymous callers.
      const site = await prisma.site.findUnique({
        where: { id: siteId },
        select: { id: true, userId: true, privacyMode: true },
      });

      // If authenticated, verify ownership
      if (isAuthenticated) {
        if (!site) {
          return NextResponse.json(
            { error: 'not_found', message: 'Site not found' },
            { status: 404 },
          );
        }

        if (site.userId !== auth?.userId) {
          return NextResponse.json(
            {
              error: 'forbidden',
              message: 'You do not have access to this site',
            },
            { status: 403 },
          );
        }
      }

      sitePrivacyMode = site?.privacyMode;
    }

    // Get latest publish for this site
    const latestPublish = await prisma.publish.findFirst({
      where: { siteId },
      orderBy: { startedAt: 'desc' },
      select: { id: true, legacy: true },
    });

    const emptyResponse = (
      isAuth: boolean,
    ): NextResponse<StatusResponse | PublicStatusResponse> => {
      if (isAuth) {
        return NextResponse.json({
          siteId,
          status: 'pending',
          files: { total: 0, pending: 0, success: 0, failed: 0 },
          blobs: [],
        } satisfies StatusResponse);
      }
      return NextResponse.json({
        status: 'pending',
      } satisfies PublicStatusResponse);
    };

    if (!latestPublish) {
      return emptyResponse(isAuthenticated);
    }

    const publishFiles = await prisma.publishFile.findMany({
      where: { publishId: latestPublish.id },
      select: { id: true, path: true, status: true, error: true },
      orderBy: { path: 'asc' },
    });

    if (publishFiles.length === 0) {
      if (latestPublish.legacy) {
        if (isAuthenticated) {
          return NextResponse.json({
            siteId,
            status: 'complete',
            files: { total: 0, pending: 0, success: 0, failed: 0 },
            blobs: [],
          } satisfies StatusResponse);
        }
        return NextResponse.json({
          status: 'complete',
        } satisfies PublicStatusResponse);
      }
      return emptyResponse(isAuthenticated);
    }

    // Tally statuses
    const statusCounts = {
      total: publishFiles.length,
      pending: 0,
      success: 0,
      failed: 0,
    };
    for (const pf of publishFiles) {
      if (pf.status === 'uploading') statusCounts.pending++;
      else if (pf.status === 'error') statusCounts.failed++;
      else statusCounts.success++; // 'success' or 'canceled'
    }

    let overallStatus: 'pending' | 'complete' | 'error';
    if (statusCounts.pending > 0) overallStatus = 'pending';
    else if (statusCounts.failed > 0) overallStatus = 'error';
    else overallStatus = 'complete';

    if (isAuthenticated) {
      return NextResponse.json({
        siteId,
        status: overallStatus,
        files: statusCounts,
        blobs: publishFiles.map(
          (pf): PublishFileStatus => ({
            id: pf.id,
            path: pf.path,
            status: pf.status,
            error: pf.error ?? null,
            extension: pf.path.split('.').pop() ?? null,
          }),
        ),
      } satisfies StatusResponse);
    }

    if (overallStatus === 'error') {
      // PASSWORD sites: return only the coarse status to anonymous callers —
      // never the failing file paths or error messages
      if (sitePrivacyMode === 'PASSWORD') {
        return NextResponse.json({
          status: 'error',
        } satisfies PublicStatusResponse);
      }
      return NextResponse.json({
        status: 'error',
        errors: publishFiles
          .filter((pf) => pf.status === 'error')
          .map((pf) => ({
            path: pf.path,
            error: pf.error ?? 'Processing failed',
          })),
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
