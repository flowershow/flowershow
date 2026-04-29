import { notFound } from 'next/navigation';
import Billing from '@/components/dashboard/billing';
import DeleteSiteForm from '@/components/dashboard/form/delete-site-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { PLANS } from '@/lib/stripe-plans';
import { api } from '@/trpc/server';

export default async function BillingSettingsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) notFound();

  const subscription = await api.stripe.getSiteSubscription.query({
    siteId: site.id,
  });

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <Billing siteId={site.id} subscription={subscription} plans={PLANS} />

        <DeleteSiteForm siteName={site.projectName} />
      </div>
    </div>
  );
}
