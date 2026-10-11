type Meta = Record<string, unknown> | null | undefined;

/** `draft: true`: reachable by URL, but never listed, in the feed or the sitemap, and noindex. */
export function isDraft(m: Meta): boolean {
  const d = m?.draft;
  return (
    d === true || (typeof d === 'string' && d.trim().toLowerCase() === 'true')
  );
}

/** Same rule as the page route's 404 (`metadata.publish === false`). */
export function isUnpublished(m: Meta): boolean {
  return m?.publish === false;
}
