import { notFound } from 'next/navigation';

import AccountBilling from '@/components/dashboard/account-billing';
import { accountPlansEnabled } from '@/lib/account-plans';
import { api } from '@/trpc/server';

export default async function AccountBillingPage() {
  if (!accountPlansEnabled()) notFound();

  const data = await api.stripe.getAccountPlan.query();

  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-8">
      <div className="flex flex-col space-y-6">
        <h1 className="font-dashboard-heading text-3xl">Billing</h1>
        <AccountBilling data={data} />
      </div>
    </div>
  );
}
