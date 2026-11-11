import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import CreateSiteButton from '@/components/dashboard/create-site-button';
import DashboardEmptyState from '@/components/dashboard/dashboard-empty-state';
import InviteBanner from '@/components/dashboard/invite-banner';
import SiteCard from '@/components/dashboard/site-card';
import {
  type BlobCounts,
  cardPeople,
  getPeopleBySite,
  loadBlobCountsBySite,
} from '@/lib/site-analytics/people-by-site';
import type { DashboardSite } from '@/server/api/routers/user';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

type CardNumbers = Promise<
  [Record<string, number> | null, Record<string, BlobCounts>]
>;

/** A site card whose people line fills in once the numbers arrive. */
async function SiteCardWithPeople({
  site,
  numbers,
}: {
  site: DashboardSite;
  numbers: CardNumbers;
}) {
  const [people, counts] = await numbers;
  return (
    <SiteCard data={site} people={cardPeople(site, counts[site.id], people)} />
  );
}

function SiteCards({
  sites,
  numbers,
}: {
  sites: DashboardSite[];
  numbers: CardNumbers;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sites.map((site) => (
        <Suspense key={site.id} fallback={<SiteCard data={site} />}>
          <SiteCardWithPeople site={site} numbers={numbers} />
        </Suspense>
      ))}
    </div>
  );
}

export default async function AllSites() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const sites = await api.user.getSites.query({});
  const owned = sites.filter((s) => s.role === 'owner');
  const shared = sites.filter((s) => s.role === 'editor');
  const ids = sites.map((s) => s.id);
  // Not awaited: the grid renders now and the people lines stream in.
  // Neither call throws.
  const numbers: CardNumbers = Promise.all([
    sites.length === 0 ? Promise.resolve(null) : getPeopleBySite(ids),
    sites.length === 0 ? Promise.resolve({}) : loadBlobCountsBySite(ids),
  ]);

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
          {shared.length > 0 && owned.length > 0 && (
            <h2 className="my-0 text-lg font-semibold">Your sites</h2>
          )}
          <SiteCards sites={owned} numbers={numbers} />
          {shared.length > 0 && (
            <>
              <h2 className="my-0 text-lg font-semibold">Shared with me</h2>
              <SiteCards sites={shared} numbers={numbers} />
            </>
          )}
        </>
      )}
    </div>
  );
}
