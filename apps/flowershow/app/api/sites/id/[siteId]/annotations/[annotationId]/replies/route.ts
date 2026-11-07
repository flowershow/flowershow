import {
  ANNOTATION_LIMITS,
  CreateAnnotationReplyRequestSchema,
  type CreateAnnotationReplyResponse,
} from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { toReplyDto } from '@/lib/annotations/dto';
import {
  errorResponse,
  invalidBodyResponse,
  readJsonBody,
  track,
} from '@/lib/annotations/http';
import { deviceFromUserAgent } from '@/lib/annotations/server';
import { authorizeAnnotationWrite } from '@/lib/annotations/write-gate';
import prisma from '@/server/db';

type Props = { params: Promise<{ siteId: string; annotationId: string }> };

/**
 * POST /api/sites/id/:siteId/annotations/:annotationId/replies
 * Open to anyone who can comment on the page, or the owner (sets byOwner). See ADR 0015.
 */
export async function POST(request: NextRequest, props: Props) {
  const { siteId, annotationId } = await props.params;

  const body = await readJsonBody(request, 'Reply is too large');
  if ('response' in body) return body.response;
  const parsed = CreateAnnotationReplyRequestSchema.safeParse(body.json);
  if (!parsed.success)
    return invalidBodyResponse(parsed.error, 'Invalid reply');

  const gate = await authorizeAnnotationWrite(request, siteId, annotationId);
  if ('response' in gate) return gate.response;

  const replies = await prisma.annotationReply.count({
    where: { annotationId: gate.annotation.id },
  });
  if (replies >= ANNOTATION_LIMITS.repliesPerAnnotation) {
    return errorResponse(
      409,
      'limit_reached',
      'This comment has reached its reply limit.',
    );
  }

  const row = await prisma.annotationReply.create({
    data: {
      annotationId: gate.annotation.id,
      note: parsed.data.note,
      authorName: parsed.data.authorName || null,
      byOwner: gate.isOwner,
    },
  });
  track(`site:${siteId}`, 'annotation_reply_created', {
    siteId,
    byOwner: gate.isOwner,
    device: deviceFromUserAgent(request.headers.get('user-agent')),
    $process_person_profile: false,
  });

  return NextResponse.json(
    { reply: toReplyDto(row) } satisfies CreateAnnotationReplyResponse,
    { status: 201 },
  );
}
