import { notFound, redirect } from 'next/navigation';
import { customDomainRedirect } from '@/lib/custom-domain-redirect';
import { SiteLookupResult } from '@/server/api/types';
import { api } from '@/trpc/server';

export async function getSite(
  user: string,
  project: string,
): Promise<SiteLookupResult> {
  let site: SiteLookupResult | null = null;

  if (user === '_domain') {
    site = await api.site.getByDomain.query({
      domain: project,
    });
  } else if (user === 'anon') {
    // Handle anonymous sites
    site = await api.site.getAnonymous.query({
      projectName: project,
    });
  } else {
    site = await api.site.get.query({
      username: user,
      projectName: project,
    });
  }

  if (!site) {
    notFound();
  }

  // Redirect to the custom domain once it works (see customDomainRedirect).
  const customDomainUrl = await customDomainRedirect(user, site);
  if (customDomainUrl) {
    return redirect(customDomainUrl);
  }

  return site;
}
