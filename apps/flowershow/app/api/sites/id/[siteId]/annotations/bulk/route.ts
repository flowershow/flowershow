import {
  AnnotationsBulkRequestSchema,
  type AnnotationsBulkResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { applyAnnotationsBulk } from '@/lib/annotations/bulk';
import {
  authorizeSiteManager,
  errorResponse,
  invalidBodyResponse,
  track,
} from '@/lib/annotations/http';
import { checkCliVersion } from '@/lib/cli-auth';
import { siteAuthzSelect } from '@/lib/site-authz';
import prisma from '@/server/db';

/** POST /api/sites/id/:siteId/annotations/bulk: a site manager (owner or Premium editor) resolves, reopens or deletes. */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const versionError = checkCliVersion(request);
  if (versionError) return versionError;

  const { siteId } = await props.params;
  const owner = await authorizeSiteManager(request, siteId, (uid) =>
    prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, ...siteAuthzSelect(uid) },
    }),
  );
  if ('response' in owner) return owner.response;

  const parsed = AnnotationsBulkRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return invalidBodyResponse(parsed.error, 'Invalid request');
  if (Boolean(parsed.data.ids) === Boolean(parsed.data.all))
    return errorResponse(400, 'bad_request', 'Pass either ids or all: true');

  const count = await applyAnnotationsBulk(prisma, siteId, parsed.data);
  if (parsed.data.action === 'resolve')
    track(owner.userId, 'annotations_resolved', { siteId, count });
  return NextResponse.json({ count } satisfies AnnotationsBulkResponse);
}
