import { Plan } from '@prisma/client';
import { env } from '@/env.mjs';
import { Feature, isFeatureEnabled } from './feature-flags';

type SiteWithUrl = {
  projectName: string;
  customDomain: string | null;
  subdomain: string;
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

  return `${protocol}://${subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
}
