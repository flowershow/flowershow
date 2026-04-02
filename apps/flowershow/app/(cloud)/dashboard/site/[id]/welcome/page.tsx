import { notFound, redirect } from 'next/navigation';
import WelcomeContent from '@/components/dashboard/welcome-content';
import { getSiteUrl } from '@/lib/get-site-url';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export default async function WelcomePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await getSession();
  if (!session) redirect('/login');

  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) {
    notFound();
  }

  const siteUrl = getSiteUrl(site);

  return (
    <WelcomeContent
      siteId={site.id}
      siteName={site.projectName}
      siteUrl={siteUrl}
    />
  );
}
