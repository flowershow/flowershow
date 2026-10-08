import { env } from '@/env.mjs';

type SiteHostFields = {
  subdomain: string;
  customDomain: string | null;
};

/** Lowercase and drop a trailing dot (`Example.com.` → `example.com`). */
export function normalizeHost(host: string | null | undefined): string {
  return (host ?? '').trim().toLowerCase().replace(/\.$/, '');
}

/**
 * Hosts that belong to Flowershow itself (dashboard, marketing/home, the root
 * app domain, the bare site domain). User content must never be served as an
 * active document on these origins.
 */
export function isAppHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  return [
    env.NEXT_PUBLIC_ROOT_DOMAIN,
    env.NEXT_PUBLIC_CLOUD_DOMAIN,
    env.NEXT_PUBLIC_HOME_DOMAIN,
    env.NEXT_PUBLIC_SITE_DOMAIN,
  ].some((d) => d && normalizeHost(d) === h);
}

/**
 * True when `host` (the request's Host header) is one of the site's own hosts:
 * its `<subdomain>.<NEXT_PUBLIC_SITE_DOMAIN>` host or its custom domain. These
 * are the only origins on which the site's own HTML may run. Flowershow's own
 * app hosts never qualify, even if a subdomain happened to collide with one.
 */
export function isSiteOwnHost(
  host: string | null | undefined,
  site: SiteHostFields,
): boolean {
  const h = normalizeHost(host);
  if (!h || isAppHost(h)) return false;

  if (site.customDomain && normalizeHost(site.customDomain) === h) return true;

  return (
    !!site.subdomain &&
    normalizeHost(`${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`) === h
  );
}
