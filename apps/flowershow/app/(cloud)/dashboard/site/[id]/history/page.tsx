import { notFound } from 'next/navigation';
import PublishHistory from '@/components/dashboard/publish-history';
import { api } from '@/trpc/server';

export default async function PublishHistoryPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const siteId = decodeURIComponent(params.id);

  const site = await api.site.getById.query({ id: siteId });
  if (!site) notFound();

  return (
    <div className="mt-6 flex flex-col space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-800">
          Publish History
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          A log of past publishes for this site, including source, status, and
          per-file details.
        </p>
      </div>
      <PublishHistory siteId={siteId} ghRepository={site.ghRepository} />
    </div>
  );
}
