import { InfoIcon } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import SiteTabs from '@/components/dashboard/site-tabs';
import { fullSiteSelect } from '@/server/api/types';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';
import SiteSettingsHeader from './header';

export default async function SiteSettingsLayout(props: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const params = await props.params;

  const { children } = props;

  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const site = await prisma.site.findUnique({
    where: {
      id: decodeURIComponent(params.id),
    },
    select: {
      ...fullSiteSelect,
      userId: true,
    },
  });

  if (!site || site.userId !== session.user.id) {
    notFound();
  }

  return (
    <>
      <SiteSettingsHeader site={site} />
      <SiteTabs siteId={site.id} />
      <div className="mb-4 mt-6 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <span>
          Heads up: the separate <strong>Site Title</strong> setting has been
          removed. Your site&apos;s name — appended as a suffix to every page
          title and shown in your navbar and footer — now comes from the{' '}
          <strong>Name</strong> field below.
        </span>
      </div>
      {children}
    </>
  );
}
