import { env } from '@/env.mjs';

type SiteWithUrl = {
  projectName: string;
  customDomain: string | null;
  subdomain: string;
  user: { username: string };
};

export function getSiteUrl(site: SiteWithUrl) {
  const { customDomain, subdomain } = site;

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';

  if (customDomain) {
    return `${protocol}://${customDomain}`;
  }

  return `${protocol}://${subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
}
