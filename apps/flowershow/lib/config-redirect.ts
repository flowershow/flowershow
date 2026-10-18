import type { SiteConfig } from '@/components/types';
import { ensureLeadingSlash } from '@/lib/utils';

/**
 * Find the config.json redirect for a page slug.
 *
 * Sites are served from the root of their own host (subdomain or custom
 * domain), so the target is returned as-is: no /@user/site prefix
 * (flowershow-7bv). Same rule as Obsidian permalink redirects in page.tsx.
 */
export function resolveConfigRedirect(
  redirects: SiteConfig['redirects'],
  slug: string,
): { url: string; permanent: boolean } | null {
  for (const r of redirects ?? []) {
    if (slug === ensureLeadingSlash(r.from)) {
      return { url: r.to, permanent: r.permanent ?? false };
    }
  }
  return null;
}
