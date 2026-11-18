import { isConvertiblePath } from '@flowershow/core';

const INDEX_RE = /(?:^|\/)index\.(?:mdx?|docx)$/;
const FOLDER_INDEX_RE = /(?:^|\/)(?:readme|index)\.(?:mdx?|docx)$/i;

/**
 * Pick the page for a slug shared by several Blobs (`getBlob` tie-break):
 * index.* over a folder index (README.*) over the first candidate. Any
 * md/mdx/canvas page beats a converted Word file, so adding `report.docx`
 * next to `report.md` never takes over the page.
 */
export function pickBlobForSlug<T extends { path: string }>(
  candidates: T[],
): T | undefined {
  const pages = candidates.filter((b) => !isConvertiblePath(b.path));
  const pool = pages.length > 0 ? pages : candidates;
  return (
    pool.find((b) => INDEX_RE.test(b.path)) ??
    pool.find((b) => FOLDER_INDEX_RE.test(b.path)) ??
    pool[0]
  );
}
