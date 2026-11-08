import type { SiteOwnerStatus } from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { siteAuthzSelect } from '@/lib/site-authz';
import { getSiteManagerFromRequest } from '@/lib/site-owner-session';
import prisma from '@/server/db';

/**
 * GET /_flowershow/owner/me  (site host; middleware rewrites it here)
 *
 * `{ isOwner }` for the current visitor, from the site-scoped owner cookie:
 * true for the owner or an editor while the site is Premium.
 * Page HTML never reads that cookie, so pages stay anonymous and cacheable;
 * this per-viewer answer is never cached.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await props.params;
  const isOwner =
    (await getSiteManagerFromRequest(request, siteId, (uid) =>
      prisma.site.findUnique({
        where: { id: siteId },
        select: siteAuthzSelect(uid),
      }),
    )) !== null;
  return NextResponse.json({ isOwner } satisfies SiteOwnerStatus, {
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
}
