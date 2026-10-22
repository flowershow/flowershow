import {
  ClaimPreviewRequestSchema,
  type ClaimPreviewResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { isExpiredTemporarySite } from '@/lib/anonymous-site';
import { ANONYMOUS_USER_ID, verifySiteClaimToken } from '@/lib/anonymous-user';
import { getSiteUrl } from '@/lib/get-site-url';
import prisma from '@/server/db';

const deny = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

/**
 * POST /api/sites/claim/preview
 * What a claim link would add to the account: the site's name, live URL and
 * expiry, so the claim page can show them before the user confirms. Only the
 * holder of the site's claim token learns anything; it changes nothing.
 */
export async function POST(request: NextRequest) {
  const parsed = ClaimPreviewRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return deny(400, 'bad_request', 'siteId and claimToken are required');
  }
  const { siteId, claimToken } = parsed.data;

  // Check the token is for this site before touching the database.
  const claim = verifySiteClaimToken(claimToken);
  if (!claim || claim.siteId !== siteId) {
    return deny(403, 'forbidden', 'This claim link is not valid');
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      projectName: true,
      customDomain: true,
      subdomain: true,
      userId: true,
      anonymousOwnerId: true,
      isTemporary: true,
      expiresAt: true,
      user: { select: { username: true } },
    },
  });
  if (!site) return deny(404, 'not_found', 'Site not found');
  if (site.userId !== ANONYMOUS_USER_ID) {
    return deny(409, 'claimed', 'This site has already been claimed');
  }
  if (site.anonymousOwnerId !== claim.anonymousUserId) {
    return deny(403, 'forbidden', 'This claim link is not valid');
  }
  if (isExpiredTemporarySite(site)) {
    return deny(410, 'expired', 'This anonymous site has expired');
  }

  return NextResponse.json({
    siteId: site.id,
    projectName: site.projectName,
    liveUrl: getSiteUrl(site),
    expiresAt: site.expiresAt?.toISOString() ?? null,
  } satisfies ClaimPreviewResponse);
}
