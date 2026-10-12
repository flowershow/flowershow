/**
 * `draft: true` in frontmatter (also the string "true", any case). A draft is
 * reachable by its URL but is never advertised: it stays out of listings,
 * feeds, the sitemap, search, tag pages and the sidebar, and is noindex.
 * Unlike `publish: false`, it is still ingested (Blob, links, tags).
 */
export function isDraft(metadata: unknown): boolean {
  if (metadata === null || typeof metadata !== 'object') return false;
  const d = (metadata as Record<string, unknown>).draft;
  return (
    d === true || (typeof d === 'string' && d.trim().toLowerCase() === 'true')
  );
}
