import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import Billing from "@/components/billing";
import { PLANS } from "@/lib/stripe";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function BillingPage({ params }: PageProps) {
  const site = await api.site.getById.query({
    id: params.id,
  });

  if (!site) {
    notFound();
  }

  const subscription = await api.stripe.getSiteSubscription.query({
    siteId: site.id,
  });

  // Pass the plans directly since they now include the price IDs
  const clientPlans = PLANS;

  return (
    <div>
      <Billing
        siteId={site.id}
        subscription={subscription}
        plans={clientPlans}
      />
    </div>
  );
}
