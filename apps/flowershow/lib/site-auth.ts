import {
  PREMIUM_REQUIRED,
  PREMIUM_REQUIRED_MESSAGE,
  siteAuthzSelect,
  siteRole,
  type SiteRole,
} from '@/lib/site-authz';
import type { Plan } from '@prisma/client';
import { type NextRequest, NextResponse } from 'next/server';
import {
  ANONYMOUS_USER_ID,
  CLAIM_TOKEN_PREFIX,
  verifySiteClaimToken,
} from '@/lib/anonymous-user';
import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';

/** Site fields the storage-limit check needs. `userId` is the site owner. */
export type AuthorizedSite = {
  id: string;
  userId: string;
  plan: Plan | null;
  storageAllowanceBytes: bigint | null;
  projectName: string;
};

export type SiteAuthResult =
  | { ok: true; kind: 'user'; userId: string; site: AuthorizedSite }
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
 * The 403 for a caller whose role does not let them manage the site, or null
 * when they may. A lapsed editor gets `premium_required` so clients can say
 * why, rather than a bare "forbidden" or "not found".
 */
export function siteAccessDenied(role: SiteRole | null): NextResponse | null {
  if (role === 'owner' || role === 'editor') return null;
  if (role === 'lapsed_editor') {
    return NextResponse.json(
      { error: PREMIUM_REQUIRED, message: PREMIUM_REQUIRED_MESSAGE },
      { status: 403 },
    );
  }
  return NextResponse.json(
    { error: 'forbidden', message: 'You do not have access to this site' },
    { status: 403 },
  );
}

/**
 * Authorize a request against one site. Accepts the CLI/PAT token of the site owner or of an editor on a Premium site,
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
    // Check the signed siteId first so a token can't be used to probe which
    // other site IDs exist.
    if (claim.siteId !== siteId) {
      return deny(
        403,
        'forbidden',
        'This claim token is not valid for this site',
      );
    }
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
    // A validly signed token for this very site whose site now belongs to an
    // account: tell the holder it was claimed (not "expired"), so the CLI keeps
    // its link and points them at `fl login` instead of publishing a new site.
    if (site.userId !== ANONYMOUS_USER_ID && site.anonymousOwnerId === null) {
      return deny(
        409,
        'claimed',
        'This site has been added to a Flowershow account. Log in to that account to update it.',
      );
    }
    if (
      site.userId !== ANONYMOUS_USER_ID ||
      site.anonymousOwnerId !== claim.anonymousUserId
    ) {
      return deny(
        403,
        'forbidden',
        'This claim token is not valid for this site',
      );
    }
    // Anonymous sites always have an expiry; treat a missing one as expired
    // (fail closed on an invariant violation).
    if (!site.expiresAt || site.expiresAt.getTime() <= Date.now()) {
      return deny(410, 'expired', 'This anonymous site has expired');
    }
    return { ok: true, kind: 'anon', siteId: site.id };
  }

  const auth = await validateAccessToken(request);
  if (!auth?.userId) return deny(401, 'unauthorized', 'Not authenticated');
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      ...siteAuthzSelect(auth.userId),
      storageAllowanceBytes: true,
      projectName: true,
    },
  });
  if (!site) return deny(404, 'not_found', 'Site not found');
  const denied = siteAccessDenied(siteRole(auth.userId, site));
  if (denied) return { ok: false, response: denied };
  return { ok: true, kind: 'user', userId: auth.userId, site };
}
