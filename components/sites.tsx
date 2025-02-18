import { redirect } from "next/navigation";

import SiteCard from "./site-card";
import { getSession } from "@/server/auth";
import { api } from "@/trpc/server";

export default async function Sites({ limit }: { limit?: number }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sites = await api.user.getSites.query({ limit });
  const username = session.user?.username;

  return (
    <>
      {sites.length > 0 && (
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center"
          >
            <div className="w-full border-t border-gray-300" />
          </div>
        </div>
      )}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sites
          .sort((a, b) => a.projectName.localeCompare(b.projectName))
          .map((site) => (
            <SiteCard key={site.id} data={site} username={username} />
          ))}
      </div>
    </>
  );
}
