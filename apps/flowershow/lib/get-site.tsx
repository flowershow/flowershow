import { notFound, redirect } from 'next/navigation';
import { PublicSite } from '@/server/api/types';
import { api } from '@/trpc/server';

export async function getSite(
  user: string,
  project: string,
): Promise<PublicSite> {
  let site: PublicSite | null = null;

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

  // Redirect to custom domain if it exists (anonymous sites don't have custom domains)
  if (user !== '_domain' && user !== 'anon' && site.customDomain) {
    return redirect(`https://${site.customDomain}`);
  }

  return site;
}
