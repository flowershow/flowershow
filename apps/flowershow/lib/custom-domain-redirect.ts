import prisma from '@/server/db';

/**
 * Where to send a visitor who opened a site on its Flowershow address, if the
 * site has a custom domain: `https://<customDomain>`, or null to serve the site
 * where it is.
 *
 * Saving a domain doesn't make it work: its DNS may not point at us yet, and
 * redirecting then would make the site unreachable on both addresses. So the
 * redirect waits until a request has reached the site through the domain
 * (`customDomainLiveAt`, see markCustomDomainLive). Vercel's own DNS check
 * can't be used: it reports domains behind a proxy such as Cloudflare as
 * misconfigured even when they work.
 */
export function customDomainRedirect(
  username: string,
  site: { customDomain: string | null; customDomainLiveAt: Date | null },
): string | null {
  // `_domain`: already on the custom domain. Anonymous sites have none.
  if (username === '_domain' || username === 'anon') return null;
  if (!site.customDomain || !site.customDomainLiveAt) return null;
  return `https://${site.customDomain}`;
}

/**
 * Records that a request reached the site through its custom domain, which
 * turns on the redirect from its Flowershow address. A no-op once recorded.
 */
export async function markCustomDomainLive(site: {
  id: string;
  customDomain: string | null;
  customDomainLiveAt: Date | null;
}): Promise<void> {
  if (!site.customDomain || site.customDomainLiveAt) return;
  await prisma.site.updateMany({
    // Matching the domain too: a domain changed since this lookup stays pending.
    where: {
      id: site.id,
      customDomain: site.customDomain,
      customDomainLiveAt: null,
    },
    data: { customDomainLiveAt: new Date() },
  });
}
