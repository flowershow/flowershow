import type { Annotation, AnnotationReply } from '@flowershow/api-contract';
import type {
  Annotation as AnnotationRow,
  AnnotationReply as ReplyRow,
} from '@prisma/client';

/** The page as it is now (undefined if it no longer exists). */
export type PageInfo = { sha: string; url: string | null };

export function toReplyDto(row: ReplyRow): AnnotationReply {
  return {
    id: row.id,
    note: row.note,
    authorName: row.authorName,
    byOwner: row.byOwner,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Pass `replies` (oldest first) loaded with the row; a row without them has none. */
export function toAnnotationDto(
  row: AnnotationRow & { replies?: ReplyRow[] },
  page: PageInfo | undefined,
): Annotation {
  return {
    id: row.id,
    siteId: row.siteId,
    path: row.path,
    pageUrl: page?.url ?? null,
    selector: {
      exact: row.exact,
      prefix: row.prefix,
      suffix: row.suffix,
      start: row.startOffset,
      end: row.endOffset,
    },
    note: row.note,
    authorName: row.authorName,
    status: row.status,
    resolvedBy: row.resolvedBy,
    replies: (row.replies ?? []).map(toReplyDto),
    pageEdited: page?.sha !== row.blobSha,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Blob paths are stored without a leading slash. */
export function normalizeAnnotationPath(path: string): string {
  return path.replace(/^\/+/, '');
}
