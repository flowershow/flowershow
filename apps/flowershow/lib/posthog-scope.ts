// Edge-safe (imported by middleware): no Prisma or Node-only imports.
import { env } from '@/env.mjs';
import { isAnonymousSite } from '@/lib/anon-site-safety';

/** Flowershow's own marketing site(s), published as a normal custom-domain site. */
export const FLOWERSHOW_OWN_DOMAINS: readonly string[] = [
  'flowershow.app',
  'www.flowershow.app',
];

/**
 * How PostHog runs on a published site:
 * - full: cookies, identify, bootstrap (Flowershow's own sites)
 * - memory: no cookies, no identify (temporary sites, whose banner sends events)
 * - off: not loaded (claimed user sites)
 */
export type PostHogMode = 'full' | 'memory' | 'off';

export function posthogModeForSite(site: {
  customDomain: string | null;
  user: { id: string };
}): PostHogMode {
  if (site.customDomain && FLOWERSHOW_OWN_DOMAINS.includes(site.customDomain)) {
    return 'full';
  }
  if (isAnonymousSite({ userId: site.user.id })) return 'memory';
  return 'off';
}

/** Only Flowershow's own hosts need the PostHog bootstrap cookie. */
export function shouldBootstrapPostHog(hostname: string): boolean {
  return (
    hostname === env.NEXT_PUBLIC_CLOUD_DOMAIN ||
    hostname === env.NEXT_PUBLIC_ROOT_DOMAIN ||
    FLOWERSHOW_OWN_DOMAINS.includes(hostname)
  );
}
