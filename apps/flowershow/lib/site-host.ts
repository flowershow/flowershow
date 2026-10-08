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
 * app domain, the bare site domain). User content is only served on a site's
 * own host, never on these.
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
 * The site's custom domain, normalized. Custom domains are unique and checked
 * against reserved domains when saved, so an exact match is the site's own
 * host. Flowershow's own sites (e.g. the home domain) use reserved domains.
 */
function usableCustomDomain(site: SiteHostFields): string | null {
  if (!site.customDomain) return null;
  return normalizeHost(site.customDomain) || null;
}

function subdomainHost(site: SiteHostFields): string | null {
  if (!site.subdomain) return null;
  const h = normalizeHost(`${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`);
  return isAppHost(h) ? null : h;
}

/**
 * True when `host` (the request's Host header) is one of the site's own hosts:
 * its custom domain or its `<subdomain>.<NEXT_PUBLIC_SITE_DOMAIN>` host.
 */
export function isSiteOwnHost(
  host: string | null | undefined,
  site: SiteHostFields,
): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  return h === usableCustomDomain(site) || h === subdomainHost(site);
}

/**
 * The site's canonical own origin (`<protocol>://<host>`): its custom domain
 * if usable, otherwise its subdomain host. `null` when the site has no usable
 * own host.
 */
export function getSiteOwnOrigin(site: SiteHostFields): string | null {
  const host = usableCustomDomain(site) ?? subdomainHost(site);
  if (!host) return null;
  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  return `${isSecure ? 'https' : 'http'}://${host}`;
}

/**
 * Response for a site resource requested on a host that isn't the site's own:
 * a 302 to `pathAndQuery` on the site's canonical own origin, or a 404 when
 * the site has no usable own host. The content itself is never served.
 */
export function redirectToSiteOwnHost(
  site: SiteHostFields,
  pathAndQuery: string,
): Response {
  const origin = getSiteOwnOrigin(site);
  if (!origin) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}${pathAndQuery}`,
      'Cache-Control': 'no-store',
    },
  });
}
