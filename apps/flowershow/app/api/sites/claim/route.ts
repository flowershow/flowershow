import {
  ClaimSiteRequestSchema,
  type ClaimSiteResponse,
} from '@flowershow/api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  ANONYMOUS_USER_ID,
  verifyOwnershipToken,
  verifySiteClaimToken,
} from '@/lib/anonymous-user';
import PostHogClient from '@/lib/server-posthog';
import { authOptions } from '@/server/auth';
import prisma from '@/server/db';

/**
 * POST /api/sites/claim
 * Claim an anonymous site after authentication
 */
export async function POST(request: NextRequest) {
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

    let anonymousUserId: string | null = null;
    if (claimToken) {
      const claim = verifySiteClaimToken(claimToken);
      if (!claim || claim.siteId !== siteId) {
        return NextResponse.json(
          { success: false, error: 'Invalid claim link for this site' },
          { status: 403 },
        );
      }
      anonymousUserId = claim.anonymousUserId;
    } else if (ownershipToken) {
      anonymousUserId = verifyOwnershipToken(ownershipToken);
    }
    if (!anonymousUserId) {
      return NextResponse.json(
        { success: false, error: 'Invalid ownership token' },
        { status: 403 },
      );
    }

    // Find the site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 },
      );
    }

    // Verify it's an anonymous site with matching ownership
    if (site.userId !== ANONYMOUS_USER_ID) {
      return NextResponse.json(
        { success: false, error: 'Site is not anonymous' },
        { status: 400 },
      );
    }

    if (site.anonymousOwnerId !== anonymousUserId) {
      return NextResponse.json(
        { success: false, error: 'Ownership verification failed' },
        { status: 403 },
      );
    }

    // Claim links stop working once the anonymous site has expired (the DB
    // expiresAt is the source of truth; the token's own JWT expiry is ignored).
    if (
      claimToken &&
      site.isTemporary &&
      site.expiresAt &&
      site.expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { success: false, error: 'This link has expired' },
        { status: 410 },
      );
    }

    // Get user's site count for analytics
    const userSitesCount = await prisma.site.count({
      where: { userId: session.user.id },
    });

    // Transfer ownership to the authenticated user
    const updatedSite = await prisma.site.update({
      where: { id: siteId },
      data: {
        userId: session.user.id,
        isTemporary: false,
        expiresAt: null,
        anonymousOwnerId: null,
        // No need to keep the creator's (hashed) IP once a user owns the site.
        anonCreatorIpHash: null,
      },
    });

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
