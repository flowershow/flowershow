import type { Site } from '@prisma/client';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import CreateSiteButton from '@/components/dashboard/create-site-button';
import DashboardEmptyState from '@/components/dashboard/dashboard-empty-state';
import SiteCard from '@/components/dashboard/site-card';
import {
  type BlobCounts,
  cardPeople,
  getPeopleBySite,
  loadBlobCountsBySite,
} from '@/lib/site-analytics/people-by-site';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

type CardNumbers = Promise<
  [Record<string, number> | null, Record<string, BlobCounts>]
>;

/** A site card whose people line fills in once the numbers arrive. */
async function SiteCardWithPeople({
  site,
  username,
  numbers,
}: {
  site: Site;
  username: string;
  numbers: CardNumbers;
}) {
  const [people, counts] = await numbers;
  return (
    <SiteCard
      data={site}
      username={username}
      people={cardPeople(site, counts[site.id], people)}
    />
  );
}

export default async function AllSites() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const sites = await api.user.getSites.query({});
  const ids = sites.map((s) => s.id);
  // Not awaited: the grid renders now and the people lines stream in.
  // Neither call throws.
  const numbers: CardNumbers | null =
    sites.length === 0
      ? null
      : Promise.all([getPeopleBySite(ids), loadBlobCountsBySite(ids)]);

  return (
    <div className="h-full flex flex-col space-y-6">
      {numbers === null ? (
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
                <Suspense
                  key={site.id}
                  fallback={
                    <SiteCard data={site} username={session.user?.username} />
                  }
                >
                  <SiteCardWithPeople
                    site={site}
                    username={session.user?.username}
                    numbers={numbers}
                  />
                </Suspense>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
