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
import { isAnnotationsEnabled } from '@/lib/annotations/enabled';
import {
  authorizeOwner,
  errorResponse,
  invalidBodyResponse,
  track,
} from '@/lib/annotations/http';
import {
  type AnnotationSite,
  annotationSiteSelect,
  deviceFromUserAgent,
  loadCurrentPages,
  loadResolvedSiteConfig,
  pageUrl,
} from '@/lib/annotations/server';
import { checkCliVersion } from '@/lib/cli-auth';
import { hasSiteAccess } from '@/lib/site-access';
import prisma from '@/server/db';

type Props = { params: Promise<{ siteId: string }> };

/**
 * The page as it is now when a visitor (no token) may read and add annotations
 * there: password gate passed, page exists, annotations on. Null otherwise.
 * Called on every visitor read and write.
 */
async function openPage(
  site: AnnotationSite,
  path: string,
  request: NextRequest,
): Promise<PageInfo | null> {
  const canView = await hasSiteAccess(site, site.id, {
    session: null,
    headers: request.headers,
  });
  if (!canView) return null;
  const blob = await prisma.blob.findUnique({
    where: { siteId_path: { siteId: site.id, path } },
    select: { metadata: true, sha: true, appPath: true },
  });
  if (!blob) return null;
  const siteConfig = await loadResolvedSiteConfig(site);
  const enabled = isAnnotationsEnabled({
    site,
    siteConfig,
    pageMetadata: blob.metadata as Record<string, unknown> | null,
    pagePath: path,
  });
  return enabled ? { sha: blob.sha, url: pageUrl(site, blob.appPath) } : null;
}

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

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: annotationSiteSelect,
  });
  if (!site) return errorResponse(404, 'not_found', 'Site not found');

  let pages = new Map<string, PageInfo>();
  const isOwnerRequest = request.headers.has('authorization');
  if (isOwnerRequest) {
    const owner = await authorizeOwner(request, async () => site);
    if ('response' in owner) return owner.response;
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
    orderBy: [{ path: 'asc' }, { startOffset: 'asc' }, { createdAt: 'asc' }],
  });
  if (isOwnerRequest) {
    pages = await loadCurrentPages(
      prisma,
      site,
      rows.map((row) => row.path),
    );
    track(site.userId, 'annotations_pulled', { siteId, count: rows.length });
  }

  return NextResponse.json({
    annotations: rows.map((row) => toAnnotationDto(row, pages.get(row.path))),
  } satisfies ListAnnotationsResponse);
}

/** POST /api/sites/id/:siteId/annotations: open to anyone who can view the page. See ADR 0015. */
export async function POST(request: NextRequest, props: Props) {
  const { siteId } = await props.params;

  const tooLarge = () =>
    errorResponse(413, 'payload_too_large', 'Annotation is too large');
  if (
    Number(request.headers.get('content-length')) > ANNOTATION_LIMITS.bodyBytes
  )
    return tooLarge();
  const text = await request.text();
  if (Buffer.byteLength(text) > ANNOTATION_LIMITS.bodyBytes) return tooLarge();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // falls through to the schema error below
  }

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
