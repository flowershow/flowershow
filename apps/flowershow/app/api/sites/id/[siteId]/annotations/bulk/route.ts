import {
  AnnotationsBulkRequestSchema,
  type AnnotationsBulkResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { applyAnnotationsBulk } from '@/lib/annotations/bulk';
import {
  authorizeOwner,
  errorResponse,
  invalidBodyResponse,
  track,
} from '@/lib/annotations/http';
import { checkCliVersion } from '@/lib/cli-auth';
import prisma from '@/server/db';

/** POST /api/sites/id/:siteId/annotations/bulk: site owner resolves, reopens or deletes. */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const versionError = checkCliVersion(request);
  if (versionError) return versionError;

  const { siteId } = await props.params;
  const owner = await authorizeOwner(request, () =>
    prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, userId: true },
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
