import { InfoIcon } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { publicSiteSelect } from '@/server/api/types';
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
      ...publicSiteSelect,
      userId: true,
    },
  });

  if (!site || site.userId !== session.user.id) {
    notFound();
  }

  return (
    <>
      <SiteSettingsHeader site={site} />
      <div className="mb-4 mt-6 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <span>
          These dashboard settings control how your site looks and behaves. If
          your site also uses{' '}
          <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">
            config.json
          </code>
          , matching values from that file will override the dashboard settings
          and may not appear here. To control a setting from the dashboard,
          remove that setting from{' '}
          <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">
            config.json
          </code>{' '}
          first.
        </span>
      </div>
      {children}
    </>
  );
}
