import { redirect } from "next/navigation";

import SiteCard from "./site-card";
import { getSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { getConfig } from "@/lib/app-config";
import { PlusIcon } from "lucide-react";
import ObsidianIcon from "./icons/obsidian";
import Link from "next/link";

const config = getConfig();

export default async function Sites({ limit }: { limit?: number }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sites = await api.user.getSites.query({ limit });
  const username = session.user?.username;

  return sites.length > 0 ? (
    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {sites
        .sort((a, b) => a.projectName.localeCompare(b.projectName))
        .map((site) => (
          <SiteCard key={site.id} data={site} username={username} />
        ))}
    </div>
  ) : (
    <div className="flex grow flex-col items-center justify-center">
      <div className="text-center">
        <h3 className="mt-2 text-lg font-semibold text-gray-900">
          You don&apos;t have any sites yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new project.
        </p>
        <div className="mt-6">
          <Link
            href="/obsidian-quickstart"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <ObsidianIcon width="24" className="mr-2" />
              Publish Your Obsidian Vault
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
