import {
  ANNOTATION_LIMITS,
  AnnotationStatusSchema,
  CreateAnnotationRequestSchema,
  type CreateAnnotationResponse,
  type ListAnnotationsResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import {
  normalizeAnnotationPath,
  type PageInfo,
  toAnnotationDto,
} from '@/lib/annotations/dto';
import {
  authorizeSiteManager,
  errorResponse,
  invalidBodyResponse,
  readJsonBody,
  track,
} from '@/lib/annotations/http';
import {
  annotationSiteSelect,
  deviceFromUserAgent,
  loadCurrentPages,
  openPage,
} from '@/lib/annotations/server';
import { checkCliVersion } from '@/lib/cli-auth';
import { siteAuthzSelect } from '@/lib/site-authz';
import prisma from '@/server/db';

type Props = { params: Promise<{ siteId: string }> };

/** GET /api/sites/id/:siteId/annotations?path=&status= */
export async function GET(request: NextRequest, props: Props) {
  const versionError = checkCliVersion(request);
  if (versionError) return versionError;

  const { siteId } = await props.params;
  const rawPath = request.nextUrl.searchParams.get('path');
  const path = rawPath ? normalizeAnnotationPath(rawPath) : null;
  const statusParam = AnnotationStatusSchema.safeParse(
    request.nextUrl.searchParams.get('status'),
  );
  const status = statusParam.success ? statusParam.data : undefined;

  let site = await prisma.site.findUnique({
    where: { id: siteId },
    select: annotationSiteSelect,
  });
  if (!site) return errorResponse(404, 'not_found', 'Site not found');

  let pages = new Map<string, PageInfo>();
  let managerId: string | null = null;
  const isOwnerRequest =
    request.headers.get('authorization')?.startsWith('Bearer ') ?? false;
  if (isOwnerRequest) {
    // Re-load with the caller's membership, filtered to them.
    const manager = await authorizeSiteManager(request, siteId, (uid) =>
      prisma.site.findUnique({
        where: { id: siteId },
        select: { ...annotationSiteSelect, ...siteAuthzSelect(uid) },
      }),
    );
    if ('response' in manager) return manager.response;
    site = manager.site;
    managerId = manager.userId;
  } else {
    if (!path) return errorResponse(400, 'bad_request', 'path is required');
    const page = await openPage(site, path, request);
    if (!page)
      return errorResponse(
        404,
        'not_found',
        'Annotations are not on for this page',
      );
    pages = new Map([[path, page]]);
    track(`site:${siteId}`, 'annotation_page_viewed', {
      siteId,
      device: deviceFromUserAgent(request.headers.get('user-agent')),
      $process_person_profile: false,
    });
  }

  const rows = await prisma.annotation.findMany({
    where: { siteId, ...(path ? { path } : {}), ...(status ? { status } : {}) },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
    orderBy: [{ path: 'asc' }, { startOffset: 'asc' }, { createdAt: 'asc' }],
  });
  if (managerId) {
    pages = await loadCurrentPages(
      prisma,
      site,
      rows.map((row) => row.path),
    );
    track(managerId, 'annotations_pulled', { siteId, count: rows.length });
  }

  return NextResponse.json({
    annotations: rows.map((row) => toAnnotationDto(row, pages.get(row.path))),
  } satisfies ListAnnotationsResponse);
}

/** POST /api/sites/id/:siteId/annotations: open to anyone who can view the page. See ADR 0015. */
export async function POST(request: NextRequest, props: Props) {
  const { siteId } = await props.params;

  const body = await readJsonBody(request, 'Annotation is too large');
  if ('response' in body) return body.response;
  const json = body.json;

  const parsed = CreateAnnotationRequestSchema.safeParse(json);
  if (!parsed.success) {
    return invalidBodyResponse(parsed.error, 'Invalid annotation');
  }
  const { selector, note, authorName } = parsed.data;
  if (selector.end - selector.start !== selector.exact.length) {
    return errorResponse(
      400,
      'bad_request',
      'selector start/end must span the quoted text',
    );
  }
  const path = normalizeAnnotationPath(parsed.data.path);

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: annotationSiteSelect,
  });
  const page = site ? await openPage(site, path, request) : null;
  if (!site || !page)
    return errorResponse(
      404,
      'not_found',
      'Annotations are not on for this page',
    );

  const [onPage, onSite] = await Promise.all([
    prisma.annotation.count({ where: { siteId, path } }),
    prisma.annotation.count({ where: { siteId } }),
  ]);
  if (
    onPage >= ANNOTATION_LIMITS.perPage ||
    onSite >= ANNOTATION_LIMITS.perSite
  ) {
    return errorResponse(
      409,
      'limit_reached',
      'This page has reached its annotation limit. Ask the site owner to clear old notes.',
    );
  }

  const row = await prisma.annotation.create({
    data: {
      siteId,
      path,
      exact: selector.exact,
      prefix: selector.prefix,
      suffix: selector.suffix,
      startOffset: selector.start,
      endOffset: selector.end,
      blobSha: page.sha,
      note,
      authorName: authorName || null,
    },
  });
  track(`site:${siteId}`, 'annotation_created', {
    siteId,
    device: deviceFromUserAgent(request.headers.get('user-agent')),
    $process_person_profile: false,
  });

  return NextResponse.json(
    {
      annotation: toAnnotationDto(row, page),
    } satisfies CreateAnnotationResponse,
    { status: 201 },
  );
}
