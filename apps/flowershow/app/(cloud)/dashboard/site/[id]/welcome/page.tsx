import { notFound, redirect } from 'next/navigation';
import WelcomeContent from '@/components/dashboard/welcome-content';
import { env } from '@/env.mjs';
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

  const username = session.user?.username;
  const protocol =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 'https' : 'http';
  const siteUrl = `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;

  return (
    <WelcomeContent
      siteId={site.id}
      siteName={site.projectName}
      siteUrl={siteUrl}
    />
  );
}
