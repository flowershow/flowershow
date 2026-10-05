import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import SiteTabs from '@/components/dashboard/site-tabs';
import { fullSiteSelect } from '@/server/api/types';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';
import SiteSettingsHeader from './settings/header';

/** Shared by the Settings, History and Annotations tab layouts: owner check, header, tabs. */
export default async function SiteTabsLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const site = await prisma.site.findUnique({
    where: { id: decodeURIComponent(id) },
    select: {
      ...fullSiteSelect,
      userId: true,
    },
  });

  if (!site || site.userId !== session.user.id) {
    notFound();
  }

  const openAnnotations = await prisma.annotation.count({
    where: { siteId: site.id, status: 'open' },
  });

  return (
    <>
      <SiteSettingsHeader site={site} />
      <SiteTabs siteId={site.id} openAnnotations={openAnnotations} />
      {children}
    </>
  );
}
