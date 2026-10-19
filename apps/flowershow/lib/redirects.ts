import type { SiteConfig } from '@/components/types';
import { ensureLeadingSlash } from '@/lib/utils';

type Redirect = NonNullable<SiteConfig['redirects']>[number];

/**
 * The first redirect whose `from` matches `path`, in config order.
 *
 * A `from` ending in `/*` matches that folder and everything below it
 * (`/old/*` matches `/old`, `/old/a` and `/old/a/b`); the matched rest of the
 * path replaces `:splat` in `to`. Any other `from` matches the exact path.
 */
export function matchRedirect(
  path: string,
  redirects: readonly Redirect[],
): { to: string; permanent: boolean } | null {
  for (const r of redirects) {
    const from = ensureLeadingSlash(r.from);
    const permanent = r.permanent ?? false;

    if (!from.endsWith('/*')) {
      if (path === from) return { to: r.to, permanent };
      continue;
    }

    const prefix = from.slice(0, -2);
    if (path !== prefix && !path.startsWith(`${prefix}/`)) continue;
    // Leading slashes are dropped so `/old//evil.com` can't turn `/:splat`
    // into the protocol-relative `//evil.com` (browsers treat `\` like `/`).
    const splat = path.slice(prefix.length).replace(/^[/\\]+/, '');
    return { to: fillSplat(r.to, splat), permanent };
  }
  return null;
}

function fillSplat(to: string, splat: string): string {
  if (splat) return to.replaceAll(':splat', splat);
  // `/new/:splat` for the bare folder goes to `/new`, not `/new/`.
  return to.replace(/\/?:splat/g, '') || '/';
}
