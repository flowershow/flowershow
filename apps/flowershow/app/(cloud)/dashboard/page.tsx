import { redirect } from 'next/navigation';
import CreateSiteButton from '@/components/dashboard/create-site-button';
import DashboardEmptyState from '@/components/dashboard/dashboard-empty-state';
import SiteCard from '@/components/dashboard/site-card';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export default async function AllSites() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const sites = await api.user.getSites.query({});

  return (
    <div className="h-full flex flex-col space-y-6">
      {sites.length === 0 ? (
        <DashboardEmptyState />
      ) : (
        <>
          <div className="flex justify-end pt-6">
            <CreateSiteButton />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sites
              .sort((a, b) => a.projectName.localeCompare(b.projectName))
              .map((site) => (
                <SiteCard
                  key={site.id}
                  data={site}
                  username={session.user?.username}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
