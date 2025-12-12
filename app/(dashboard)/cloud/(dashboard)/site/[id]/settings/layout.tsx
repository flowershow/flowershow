import { notFound, redirect } from 'next/navigation';
import { ReactNode } from 'react';
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
    include: {
      user: true,
    },
  });

  if (!site || site.userId !== session.user.id) {
    notFound();
  }

  return (
    <>
      <SiteSettingsHeader site={site} />
      {children}
    </>
  );
}
