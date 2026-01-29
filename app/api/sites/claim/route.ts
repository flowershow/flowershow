import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ANONYMOUS_USER_ID, verifyOwnershipToken } from '@/lib/anonymous-user';
import PostHogClient from '@/lib/server-posthog';
import { authOptions } from '@/server/auth';
import prisma from '@/server/db';

interface ClaimRequest {
  siteId: string;
  ownershipToken: string;
}

interface ClaimResponse {
  success: boolean;
  site?: {
    id: string;
    projectName: string;
    userId: string;
  };
  error?: string;
}

/**
 * POST /api/sites/claim
 * Claim an anonymous site after authentication
 */
export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/sites/claim',
    },
    async (span) => {
      try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 },
          );
        }

        span.setAttribute('user_id', session.user.id);

        // Parse request
        const body = (await request.json()) as ClaimRequest;
        const { siteId, ownershipToken } = body;

        // Validate inputs
        if (!siteId || !ownershipToken) {
          return NextResponse.json(
            { success: false, error: 'siteId and ownershipToken are required' },
            { status: 400 },
          );
        }

        // Verify ownership token - returns anonymousUserId if valid
        const anonymousUserId = verifyOwnershipToken(ownershipToken);
        if (!anonymousUserId) {
          span.setAttribute('token_valid', false);
          return NextResponse.json(
            { success: false, error: 'Invalid ownership token' },
            { status: 403 },
          );
        }

        span.setAttribute('site_id', siteId);
        span.setAttribute('token_valid', true);

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
          },
        });

        span.setAttribute('claim_successful', true);

        // Track analytics
        const posthog = PostHogClient();
        posthog.capture({
          distinctId: session.user.id,
          event: 'anon_claim_completed',
          properties: {
            site_id: siteId,
            sites_owned_count: userSitesCount + 1,
            auth_method: 'nextauth', // Could be refined based on provider
          },
        });
        await posthog.shutdown();

        const response: ClaimResponse = {
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
        Sentry.captureException(error);

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to claim site. Please try again.',
          },
          { status: 500 },
        );
      }
    },
  );
}
