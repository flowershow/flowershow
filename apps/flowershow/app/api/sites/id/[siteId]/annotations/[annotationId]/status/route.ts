import {
  SetAnnotationStatusRequestSchema,
  type SetAnnotationStatusResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { toAnnotationDto } from '@/lib/annotations/dto';
import {
  invalidBodyResponse,
  readJsonBody,
  track,
} from '@/lib/annotations/http';
import { deviceFromUserAgent } from '@/lib/annotations/server';
import { authorizeAnnotationWrite } from '@/lib/annotations/write-gate';
import prisma from '@/server/db';

type Props = { params: Promise<{ siteId: string; annotationId: string }> };

/**
 * POST /api/sites/id/:siteId/annotations/:annotationId/status
 * Resolve or reopen. Open to anyone who can comment on the page, or the owner;
 * delete stays owner-only (bulk route). See ADR 0015.
 */
export async function POST(request: NextRequest, props: Props) {
  const { siteId, annotationId } = await props.params;

  const body = await readJsonBody(request, 'Request is too large');
  if ('response' in body) return body.response;
  const parsed = SetAnnotationStatusRequestSchema.safeParse(body.json);
  if (!parsed.success)
    return invalidBodyResponse(parsed.error, 'Invalid status change');
  const { status, authorName } = parsed.data;

  const gate = await authorizeAnnotationWrite(request, siteId, annotationId);
  if ('response' in gate) return gate.response;

  const row = await prisma.annotation.update({
    where: { id: gate.annotation.id },
    data:
      status === 'resolved'
        ? { status, resolvedAt: new Date(), resolvedBy: authorName || null }
        : { status, resolvedAt: null, resolvedBy: null },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
  });
  track(`site:${siteId}`, 'annotation_status_changed', {
    siteId,
    status,
    byOwner: gate.isOwner,
    device: deviceFromUserAgent(request.headers.get('user-agent')),
    $process_person_profile: false,
  });

  return NextResponse.json({
    annotation: toAnnotationDto(row, gate.page),
  } satisfies SetAnnotationStatusResponse);
}
