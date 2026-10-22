import {
  ClaimSiteWithTokenRequestSchema,
  type ClaimSiteWithTokenResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { verifySiteClaimToken } from '@/lib/anonymous-user';
import { claimAnonSite } from '@/lib/claim-anon-site';
import { checkCliVersion, validateAccessToken } from '@/lib/cli-auth';
import { getSiteUrl } from '@/lib/get-site-url';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';

const deny = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

/**
 * POST /api/sites/id/:siteId/claim
 * Claim an anonymous site into the account of the caller's CLI token or PAT
 * (`Authorization: Bearer fs_cli_…|fs_pat_…`), proving the right to it with
 * the site's claim token in the body. Used by `fl` when a folder published
 * with `--anon` is published again while logged in (flowershow-2yl).
 *
 * Unlike /api/sites/claim (the browser claim page: session cookie,
 * same-origin only), this route takes no cookies, so it is not open to CSRF.
 * Claiming a site the caller already owns succeeds (idempotent retry).
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const versionError = checkCliVersion(request);
  if (versionError) return versionError;

  try {
    const auth = await validateAccessToken(request);
    if (!auth?.userId) return deny(401, 'unauthorized', 'Not authenticated');

    const { siteId } = await props.params;
    const parsed = ClaimSiteWithTokenRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return deny(400, 'invalid_request', 'claimToken is required');
    }
    const { claimToken } = parsed.data;

    // Check the token is for this site before touching the database, so the
    // route can't be used to probe which site IDs exist.
    const claim = verifySiteClaimToken(claimToken);
    if (!claim || claim.siteId !== siteId) {
      return deny(
        403,
        'forbidden',
        'This claim token is not valid for this site',
      );
    }

    const result = await claimAnonSite({
      siteId,
      userId: auth.userId,
      claimToken,
    });

    let alreadyClaimed = false;
    if (!result.ok) {
      if (result.status === 409) {
        // Already claimed: fine if it was claimed into this very account
        // (e.g. via the claim link, or a retried request).
        const owner = await prisma.site.findUnique({
          where: { id: siteId },
          select: { userId: true },
        });
        if (owner?.userId !== auth.userId) {
          return deny(
            409,
            'claimed',
            'This site has already been added to another Flowershow account.',
          );
        }
        alreadyClaimed = true;
      } else if (result.status === 410) {
        return deny(
          410,
          'expired',
          'This anonymous site has expired and can no longer be claimed.',
        );
      } else if (result.status === 404) {
        return deny(404, 'not_found', 'Site not found');
      } else {
        return deny(
          403,
          'forbidden',
          'This claim token is not valid for this site',
        );
      }
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        projectName: true,
        customDomain: true,
        subdomain: true,
        user: { select: { username: true } },
      },
    });
    if (!site) return deny(404, 'not_found', 'Site not found');

    if (!alreadyClaimed) {
      const posthog = PostHogClient();
      posthog.capture({
        distinctId: auth.userId,
        event: 'anon_claim_completed',
        properties: { site_id: siteId, claim_method: 'cli' },
      });
      await posthog.shutdown();
    }

    return NextResponse.json({
      site: {
        id: site.id,
        projectName: site.projectName,
        url: getSiteUrl(site),
      },
      alreadyClaimed,
    } satisfies ClaimSiteWithTokenResponse);
  } catch (error) {
    console.error('CLI claim error:', error);
    const posthog = PostHogClient();
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/id/[siteId]/claim',
    });
    await posthog.shutdown();
    return deny(
      500,
      'internal_error',
      'Failed to claim site. Please try again.',
    );
  }
}
