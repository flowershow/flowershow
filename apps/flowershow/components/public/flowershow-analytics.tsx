import Script from 'next/script';
import { env } from '@/env.mjs';
import { UMAMI_HOST, UMAMI_WEBSITE_ID } from '@/lib/site-analytics/config';

/**
 * Attributes for Flowershow's own Umami script, tagged with the site id.
 * Null (render nothing) for password-protected sites, outside production,
 * or while the Umami host / website id are not configured.
 */
export function flowershowUmamiAttrs(
  site: { id: string; privacyMode: string },
  opts: { host: string; websiteId: string; vercelEnv?: string },
): Record<string, string> | null {
  if (site.privacyMode === 'PASSWORD') return null;
  if (opts.vercelEnv !== 'production') return null;
  if (!opts.host || !opts.websiteId) return null;
  return {
    src: `${opts.host}/script.js`,
    'data-website-id': opts.websiteId,
    'data-tag': site.id,
    'data-exclude-search': 'true',
    'data-exclude-hash': 'true',
  };
}

export function FlowershowAnalytics({
  site,
}: {
  site: { id: string; privacyMode: string };
}) {
  const attrs = flowershowUmamiAttrs(site, {
    host: UMAMI_HOST,
    websiteId: UMAMI_WEBSITE_ID,
    vercelEnv: env.NEXT_PUBLIC_VERCEL_ENV,
  });
  if (!attrs) return null;
  return <Script defer {...(attrs as { src: string })} />;
}
