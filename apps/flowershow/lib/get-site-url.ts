import { Plan } from '@prisma/client';
import { env } from '@/env.mjs';
import { Feature, isFeatureEnabled } from './feature-flags';
import { resolveSiteAlias } from './resolve-site-alias';

type SiteWithUrl = {
  projectName: string;
  customDomain: string | null;
  plan: Plan;
  user: { username: string };
};

export function getSiteUrl(site: SiteWithUrl) {
  const { projectName, user, customDomain } = site;

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';

  if (isFeatureEnabled(Feature.CustomDomain, site) && customDomain) {
    return `${protocol}://${site.customDomain}`;
  } else {
    const username = user.username;
    const sitePath = resolveSiteAlias(`/@${username}/${projectName}`, 'to');
    return `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${sitePath}`;
  }
}

export function getSiteUrlPath(site: SiteWithUrl) {
  const { projectName, user, customDomain } = site;

  if (isFeatureEnabled(Feature.CustomDomain, site) && customDomain) {
    return '';
  } else {
    const username = user.username;
    return resolveSiteAlias(`/@${username}/${projectName}`, 'to');
  }
}
