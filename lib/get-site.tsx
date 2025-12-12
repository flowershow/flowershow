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
  } else {
    site = await api.site.get.query({
      ghUsername: user,
      projectName: project,
    });
  }

  if (!site) {
    notFound();
  }

  // Redirect to custom domain if it exists
  if (user !== '_domain' && site.customDomain) {
    return redirect(`https://${site.customDomain}`);
  }

  return site;
}
