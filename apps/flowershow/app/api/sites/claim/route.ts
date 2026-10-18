import {
  ClaimSiteRequestSchema,
  type ClaimSiteResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { claimAnonSite } from '@/lib/claim-anon-site';
import PostHogClient from '@/lib/server-posthog';
import { authOptions } from '@/server/auth';
import prisma from '@/server/db';

/**
 * Only our own claim page may call this route. The session cookie is
 * SameSite=Lax, so it is sent on POSTs from sibling *.flowershow.app origins
 * (same-site); require a same-origin Origin, and JSON so cross-origin callers
 * can't send a no-preflight "simple" request.
 */
function rejectCrossSite(request: NextRequest): NextResponse | null {
  const host = request.headers.get('host') ?? request.nextUrl.host;
  const fetchSite = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {}
  // Browsers send Origin on POST; if something stripped it, Sec-Fetch-Site
  // (which pages can't forge) must vouch for the request instead.
  const sameOrigin = origin
    ? originHost === host && (!fetchSite || fetchSite === 'same-origin')
    : fetchSite === 'same-origin';
  if (!sameOrigin) {
    return NextResponse.json(
      { success: false, error: 'Cross-origin requests are not allowed' },
      { status: 403 },
    );
  }
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    return NextResponse.json(
      { success: false, error: 'Content-Type must be application/json' },
      { status: 415 },
    );
  }
  return null;
}

/**
 * POST /api/sites/claim
 * Claim an anonymous site after authentication
 */
export async function POST(request: NextRequest) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse request
    const parsedBody = ClaimSiteRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'siteId and either claimToken or ownershipToken are required',
        },
        { status: 400 },
      );
    }

    const { siteId, ownershipToken, claimToken } = parsedBody.data;

    // Get user's site count for analytics
    const userSitesCount = await prisma.site.count({
      where: { userId: session.user.id },
    });

    // Transfer ownership to the authenticated user (single conditional write).
    const result = await claimAnonSite({
      siteId,
      userId: session.user.id,
      claimToken,
      ownershipToken,
    });
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }
    const updatedSite = result.site;

    // Track analytics
    const posthog = PostHogClient();
    posthog.capture({
      distinctId: session.user.id,
      event: 'anon_claim_completed',
      properties: {
        site_id: siteId,
        sites_owned_count: userSitesCount + 1,
        auth_method: 'nextauth', // Could be refined based on provider
        claim_method: claimToken ? 'link' : 'browser',
      },
    });
    await posthog.shutdown();

    const response: ClaimSiteResponse = {
      success: true,
      site: {
        id: updatedSite.id,
        projectName: updatedSite.projectName,
        userId: updatedSite.userId,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Claim error:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/claim',
    });
    await posthog.shutdown();

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to claim site. Please try again.',
      },
      { status: 500 },
    );
  }
}
