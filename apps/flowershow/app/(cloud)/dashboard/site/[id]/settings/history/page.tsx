import { notFound } from 'next/navigation';
import PublishHistory from '@/components/dashboard/publish-history';
import SettingsNav from '@/components/dashboard/settings-nav';
import { api } from '@/trpc/server';

export default async function PublishHistoryPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const siteId = decodeURIComponent(params.id);

  const site = await api.site.getById.query({ id: siteId });
  if (!site) notFound();

  const publishes = await api.site.getPublishHistory.query({ id: siteId });

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">
            Publish History
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            A log of past publishes for this site, including source, status, and
            per-file details.
          </p>
        </div>
        <PublishHistory
          publishes={publishes}
          ghRepository={site.ghRepository}
        />
      </div>
    </div>
  );
}
