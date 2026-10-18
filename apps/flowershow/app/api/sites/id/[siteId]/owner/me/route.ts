import type { SiteOwnerStatus } from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { getSiteOwnerFromRequest } from '@/lib/site-owner-session';
import prisma from '@/server/db';

/**
 * GET /_flowershow/owner/me  (site host; middleware rewrites it here)
 *
 * `{ isOwner }` for the current visitor, from the site-scoped owner cookie.
 * Page HTML never reads that cookie, so pages stay anonymous and cacheable;
 * this per-viewer answer is never cached.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await props.params;
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, userId: true },
  });
  const isOwner = site
    ? (await getSiteOwnerFromRequest(request, site)) !== null
    : false;
  return NextResponse.json({ isOwner } satisfies SiteOwnerStatus, {
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
}
