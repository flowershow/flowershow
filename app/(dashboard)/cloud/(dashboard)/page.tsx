import { Suspense } from 'react';
import MigrationBanner from '@/components/dashboard/migration-banner';
import PlaceholderCard from '@/components/dashboard/placeholder-card';
import SiteQuickstarts from '@/components/dashboard/site-quickstarts';
import Sites from '@/components/dashboard/sites';
import { api } from '@/trpc/server';

export default async function AllSites() {
  // Check if user has OAuth-only sites that need migration
  const oauthSites = await api.user.hasOAuthOnlySites.query();

  return (
    <div className="flex flex-col space-y-6">
      {oauthSites.length > 0 && (
        <MigrationBanner sites={oauthSites} className="mt-6" />
      )}
      <SiteQuickstarts />
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <PlaceholderCard key={i} />
            ))}
          </div>
        }
      >
        <Sites />
      </Suspense>
    </div>
  );
}
