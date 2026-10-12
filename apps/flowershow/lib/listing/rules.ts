type Meta = Record<string, unknown> | null | undefined;

/** `draft: true`: reachable by URL, but never listed, in the feed, search, tag pages, the sidebar or the sitemap, and noindex. */
export { isDraft } from '@flowershow/core';

/** Same rule as the page route's 404 (`metadata.publish === false`). */
export function isUnpublished(m: Meta): boolean {
  return m?.publish === false;
}
