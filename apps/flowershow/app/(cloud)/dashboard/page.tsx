import { redirect } from 'next/navigation';
import CreateSiteButton from '@/components/dashboard/create-site-button';
import DashboardEmptyState from '@/components/dashboard/dashboard-empty-state';
import InviteBanner from '@/components/dashboard/invite-banner';
import SiteCard from '@/components/dashboard/site-card';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export default async function AllSites() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const sites = await api.user.getSites.query({});
  const owned = sites.filter((s) => s.role === 'owner');
  const shared = sites.filter((s) => s.role === 'editor');

  return (
    <div className="h-full flex flex-col space-y-6">
      <InviteBanner />
      {sites.length === 0 ? (
        <DashboardEmptyState />
      ) : (
        <>
          <div className="flex justify-end pt-6">
            <CreateSiteButton />
          </div>
          {shared.length > 0 && (
            <h2 className="my-0 text-lg font-semibold">Your sites</h2>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {owned.map((site) => (
              <SiteCard key={site.id} data={site} />
            ))}
          </div>
          {shared.length > 0 && (
            <>
              <h2 className="my-0 text-lg font-semibold">Shared with me</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shared.map((site) => (
                  <SiteCard key={site.id} data={site} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
