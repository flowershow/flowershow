import { InfoIcon, ExternalLinkIcon } from 'lucide-react';
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
          <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">
            config.json
          </code>{' '}
          still works — values in your config file always take precedence over
          dashboard settings. But most options no longer require it.{' '}
          <a
            href="https://flowershow.app/changelog/2026-05-21-unified-settings"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 underline hover:text-blue-900"
          >
            Learn more
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </span>
      </div>
      {children}
    </>
  );
}
