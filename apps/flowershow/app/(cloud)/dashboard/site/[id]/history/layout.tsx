import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import SiteTabs from '@/components/dashboard/site-tabs';
import { publicSiteSelect } from '@/server/api/types';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';
import SiteSettingsHeader from '../settings/header';

export default async function SiteHistoryLayout(props: {
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
      <SiteTabs siteId={site.id} />
      {children}
    </>
  );
}
