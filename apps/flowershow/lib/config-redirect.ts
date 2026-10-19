import type { SiteConfig } from '@/components/types';
import { ensureLeadingSlash } from '@/lib/utils';

/**
 * Find the config.json redirect for a page slug: the first rule that matches,
 * in config order.
 *
 * A `from` ending in `/*` matches that folder and everything below it
 * (`/old/*` matches `/old`, `/old/a` and `/old/a/b`); the matched rest of the
 * path replaces `:splat` in `to`. Any other `from` matches the exact path.
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
    const from = ensureLeadingSlash(r.from);
    const permanent = r.permanent ?? false;

    if (!from.endsWith('/*')) {
      if (slug === from) return { url: r.to, permanent };
      continue;
    }

    const prefix = from.slice(0, -2);
    if (slug !== prefix && !slug.startsWith(`${prefix}/`)) continue;
    // Leading slashes are dropped so `/old//evil.com` can't turn `/:splat`
    // into the protocol-relative `//evil.com` (browsers treat `\` like `/`).
    const splat = slug.slice(prefix.length).replace(/^[/\\]+/, '');
    return { url: fillSplat(r.to, splat), permanent };
  }
  return null;
}

function fillSplat(to: string, splat: string): string {
  if (splat) return to.replaceAll(':splat', splat);
  // `/new/:splat` for the bare folder goes to `/new`, not `/new/`.
  return to.replace(/\/?:splat/g, '') || '/';
}
