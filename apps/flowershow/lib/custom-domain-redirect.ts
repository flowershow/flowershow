import { unstable_cache } from 'next/cache';
import { env } from '@/env.mjs';
import { getConfigResponse, getDomainResponse } from '@/lib/domains';

/**
 * Whether Vercel serves `domain` for this project: the domain is verified and
 * its DNS points at us. Cached per domain for 5 minutes, so a site's subdomain
 * starts redirecting within minutes of its DNS going live.
 */
const isDomainServed = unstable_cache(
  async (domain: string): Promise<boolean> => {
    const [domainJson, configJson] = await Promise.all([
      getDomainResponse(domain),
      getConfigResponse(domain),
    ]);
    return (
      !domainJson.error &&
      domainJson.verified === true &&
      configJson.misconfigured === false
    );
  },
  ['custom-domain-served'],
  { revalidate: 300 },
);

/**
 * Where to send a visitor who opened a site on its Flowershow address, if the
 * site has a custom domain: `https://<customDomain>`, or null to serve the site
 * where it is.
 *
 * In production the redirect waits until the custom domain actually works.
 * Saving a domain doesn't make it work: its DNS may not point at us yet, and
 * redirecting then would make the site unreachable on both addresses. Other
 * environments never provision domains in Vercel, so they redirect as soon as
 * one is set.
 */
export async function customDomainRedirect(
  username: string,
  site: { customDomain: string | null },
): Promise<string | null> {
  // `_domain`: already on the custom domain. Anonymous sites have none.
  if (username === '_domain' || username === 'anon' || !site.customDomain) {
    return null;
  }
  const target = `https://${site.customDomain}`;
  if (env.NEXT_PUBLIC_VERCEL_ENV !== 'production') return target;
  try {
    return (await isDomainServed(site.customDomain)) ? target : null;
  } catch {
    return null;
  }
}
