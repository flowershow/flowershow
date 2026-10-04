import type { PageMetadata } from '@/server/api/types';

/**
 * The description to show *on the page itself* (page header, hero, changelog
 * entry). A computed description is the page's own opening sentence, so showing
 * it above the body would repeat it — those places get nothing instead.
 * Everywhere else (cards, meta tags, listings, RSS, search) uses
 * `metadata.description` directly.
 */
export function displayDescription(
  metadata: Pick<PageMetadata, 'description' | 'computed'> | null | undefined,
): string | undefined {
  if (!metadata || metadata.computed?.includes('description')) return undefined;
  const d = metadata.description;
  return d == null || d === '' ? undefined : String(d);
}
