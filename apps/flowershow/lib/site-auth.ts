import { type NextRequest, NextResponse } from 'next/server';
import {
  ANONYMOUS_USER_ID,
  CLAIM_TOKEN_PREFIX,
  verifySiteClaimToken,
} from '@/lib/anonymous-user';
import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

export type SiteAuthResult =
  | { ok: true; kind: 'user'; userId: string }
  | { ok: true; kind: 'anon'; siteId: string }
  | { ok: false; response: NextResponse };

const deny = (
  status: number,
  error: string,
  message: string,
): SiteAuthResult => ({
  ok: false,
  response: NextResponse.json({ error, message }, { status }),
});

/**
 * Authorize a request against one site. Accepts the site owner's CLI/PAT token,
 * or a site-scoped claim token (fs_claim_…) for that same anonymous, unexpired site.
 */
export async function authorizeSiteRequest(
  request: NextRequest,
  siteId: string,
): Promise<SiteAuthResult> {
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (bearer.startsWith(CLAIM_TOKEN_PREFIX)) {
    const claim = verifySiteClaimToken(bearer);
    if (!claim) return deny(401, 'unauthorized', 'Invalid claim token');
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        userId: true,
        anonymousOwnerId: true,
        expiresAt: true,
      },
    });
    if (!site) return deny(404, 'not_found', 'Site not found');
    if (
      claim.siteId !== site.id ||
      site.userId !== ANONYMOUS_USER_ID ||
      site.anonymousOwnerId !== claim.anonymousUserId
    ) {
      return deny(
        403,
        'forbidden',
        'This claim token is not valid for this site (it may already have been claimed)',
      );
    }
    if (site.expiresAt && site.expiresAt.getTime() <= Date.now()) {
      return deny(410, 'expired', 'This anonymous site has expired');
    }
    return { ok: true, kind: 'anon', siteId: site.id };
  }

  const auth = await validateAccessToken(request);
  if (!auth?.userId) return deny(401, 'unauthorized', 'Not authenticated');
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, userId: true },
  });
  if (!site) return deny(404, 'not_found', 'Site not found');
  if (site.userId !== auth.userId)
    return deny(403, 'forbidden', 'You do not have access to this site');
  return { ok: true, kind: 'user', userId: auth.userId };
}
