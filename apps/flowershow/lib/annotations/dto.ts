import type { Annotation } from '@flowershow/api-contract';
import type { Annotation as AnnotationRow } from '@prisma/client';

/** The page as it is now (undefined if it no longer exists). */
export type PageInfo = { sha: string; url: string | null };

export function toAnnotationDto(
  row: AnnotationRow,
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
    pageEdited: page?.sha !== row.blobSha,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Blob paths are stored without a leading slash. */
export function normalizeAnnotationPath(path: string): string {
  return path.replace(/^\/+/, '');
}
