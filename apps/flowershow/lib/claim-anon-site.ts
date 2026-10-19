import {
  ANONYMOUS_USER_ID,
  verifyOwnershipToken,
  verifySiteClaimToken,
} from '@/lib/anonymous-user';
import prisma from '@/server/db';

/**
 * Move an anonymous site into a user's account. Shared by the claim page
 * (/api/sites/claim) and the MCP `claim-site` tool.
 *
 * The transfer is a single conditional write (still anonymous, same anonymous
 * owner, and for claim links not yet expired), so of two concurrent claims
 * exactly one succeeds; the other gets 409 (flowershow-nds).
 */

export type ClaimAnonSiteInput = {
  siteId: string;
  userId: string;
  claimToken?: string;
  ownershipToken?: string;
  now?: Date;
};

export type ClaimAnonSiteResult =
  | {
      ok: true;
      site: { id: string; projectName: string; userId: string };
      method: 'link' | 'browser';
    }
  | { ok: false; status: 400 | 403 | 404 | 409 | 410; error: string };

const fail = (
  status: 400 | 403 | 404 | 409 | 410,
  error: string,
): ClaimAnonSiteResult => ({ ok: false, status, error });

export async function claimAnonSite(
  input: ClaimAnonSiteInput,
): Promise<ClaimAnonSiteResult> {
  const {
    siteId,
    userId,
    claimToken,
    ownershipToken,
    now = new Date(),
  } = input;

  let anonymousUserId: string | null = null;
  if (claimToken) {
    const claim = verifySiteClaimToken(claimToken);
    if (!claim || claim.siteId !== siteId) {
      return fail(403, 'Invalid claim link for this site');
    }
    anonymousUserId = claim.anonymousUserId;
  } else if (ownershipToken) {
    anonymousUserId = verifyOwnershipToken(ownershipToken);
  } else {
    return fail(
      400,
      'siteId and either claimToken or ownershipToken are required',
    );
  }
  if (!anonymousUserId) return fail(403, 'Invalid ownership token');

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      userId: true,
      anonymousOwnerId: true,
      isTemporary: true,
      expiresAt: true,
    },
  });
  if (!site) return fail(404, 'Site not found');
  if (site.userId !== ANONYMOUS_USER_ID) {
    return fail(409, 'This site has already been claimed');
  }
  if (site.anonymousOwnerId !== anonymousUserId) {
    return fail(403, 'Ownership verification failed');
  }
  // Claim links stop working once the anonymous site has expired (the DB
  // expiresAt is the source of truth; the token's own JWT expiry is ignored).
  if (
    claimToken &&
    site.isTemporary &&
    site.expiresAt &&
    site.expiresAt.getTime() <= now.getTime()
  ) {
    return fail(410, 'This link has expired');
  }

  const { count } = await prisma.site.updateMany({
    where: {
      id: siteId,
      userId: ANONYMOUS_USER_ID,
      anonymousOwnerId: anonymousUserId,
      ...(claimToken && {
        OR: [
          { isTemporary: false },
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      }),
    },
    data: {
      userId,
      isTemporary: false,
      expiresAt: null,
      anonymousOwnerId: null,
      // No need to keep the creator's (hashed) IP once a user owns the site.
      anonCreatorIpHash: null,
    },
  });
  if (count === 0) {
    // Lost a race with another claim (or the site expired in between).
    return fail(409, 'This site has already been claimed');
  }

  const claimed = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, projectName: true, userId: true },
  });
  if (!claimed) return fail(404, 'Site not found');
  return { ok: true, site: claimed, method: claimToken ? 'link' : 'browser' };
}
