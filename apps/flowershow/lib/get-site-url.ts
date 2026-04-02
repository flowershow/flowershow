import { Plan } from '@prisma/client';
import { env } from '@/env.mjs';
import { Feature, isFeatureEnabled } from './feature-flags';
import { resolveSiteAlias } from './resolve-site-alias';

type SiteWithUrl = {
  projectName: string;
  customDomain: string | null;
  subdomain: string | null;
  plan: Plan;
  user: { username: string };
};

export function getSiteUrl(site: SiteWithUrl) {
  const { customDomain, subdomain } = site;

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';

  if (isFeatureEnabled(Feature.CustomDomain, site) && customDomain) {
    return `${protocol}://${customDomain}`;
  }

  if (subdomain) {
    return `${protocol}://${subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
  }

  // Fallback for sites without a subdomain (pre-migration safety net)
  const sitePath = resolveSiteAlias(
    `/@${site.user.username}/${site.projectName}`,
    'to',
  );
  return `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${sitePath}`;
}

/** @deprecated Sites are now served at the root of their hostname. Use '' directly. Will be removed in a follow-up task. */

export function getSiteUrlPath(_site: SiteWithUrl) {
  return '';
}
