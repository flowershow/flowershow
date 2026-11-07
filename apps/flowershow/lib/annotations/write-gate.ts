import type { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db';
import type { PageInfo } from './dto';
import { errorResponse, isSiteOwner } from './http';
import { annotationSiteSelect, loadCurrentPages, openPage } from './server';

/**
 * Gate for writes on one existing annotation (reply, resolve/reopen). The
 * annotation must belong to `siteId` (an id from another site is a 404), and
 * the caller must be the site owner (bearer token or owner cookie) or a visitor
 * who may comment on the annotation's page right now. Never trust the id alone.
 */
export async function authorizeAnnotationWrite(
  request: NextRequest,
  siteId: string,
  annotationId: string,
): Promise<
  | {
      annotation: { id: string; path: string };
      /** The page as it is now (undefined if it no longer exists). */
      page: PageInfo | undefined;
      isOwner: boolean;
    }
  | { response: NextResponse }
> {
  const notFound = () =>
    errorResponse(404, 'not_found', 'Annotations are not on for this page');
  const [site, annotation] = await Promise.all([
    prisma.site.findUnique({
      where: { id: siteId },
      select: annotationSiteSelect,
    }),
    prisma.annotation.findFirst({
      where: { id: annotationId, siteId },
      select: { id: true, path: true },
    }),
  ]);
  if (!site || !annotation) return { response: notFound() };

  const isOwner = await isSiteOwner(request, site);
  let page = (await openPage(site, annotation.path, request)) ?? undefined;
  if (!isOwner && !page) return { response: notFound() };
  if (!page) {
    page = (await loadCurrentPages(prisma, site, [annotation.path])).get(
      annotation.path,
    );
  }
  return { annotation, page, isOwner };
}
