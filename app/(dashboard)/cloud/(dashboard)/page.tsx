import { Suspense } from "react";
import Sites from "@/components/dashboard/sites";
import PlaceholderCard from "@/components/dashboard/placeholder-card";
import SiteQuickstarts from "@/components/dashboard/site-quickstarts";

export default function AllSites() {
  return (
    <div className="flex flex-col space-y-6">
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
