import type { SiteConfig } from '@/components/types';

const MARKDOWN_PAGE = /\.mdx?$/i;

export type AnnotationGateInput = {
  site: { isTemporary?: boolean | null; anonymousOwnerId?: string | null };
  siteConfig: Pick<SiteConfig, 'annotations'> | null | undefined;
  pageMetadata: { annotations?: unknown; publish?: unknown } | null | undefined;
  /** Blob path of the page, e.g. `notes/draft.md`. */
  pagePath: string;
};

/**
 * The one rule for whether a page accepts and shows annotations. Shared by the
 * page renderer (overlay, noindex) and the API (accept or serve notes).
 * Site-level off is final (kill switch); a page can opt out with
 * `annotations: false` when the site is on.
 */
export function isAnnotationsEnabled({
  site,
  siteConfig,
  pageMetadata,
  pagePath,
}: AnnotationGateInput): boolean {
  if (!MARKDOWN_PAGE.test(pagePath)) return false;
  // Unclaimed anonymous sites are excluded from Phase 0: nobody could moderate.
  if (site.isTemporary && site.anonymousOwnerId) return false;
  if (siteConfig?.annotations !== true) return false;
  // Same condition the page renderer 404s on; never reveal a hidden draft.
  if (pageMetadata?.publish === false) return false;
  return pageMetadata?.annotations !== false;
}
