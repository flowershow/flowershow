import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { GithubIcon } from "lucide-react";
/* import Status from "./status"; */
import SyncSiteButton from "./sync-button";
import { env } from "@/env.mjs";
/* import { api } from "@/trpc/server"; */

export default async function SiteSettingsHeader({
  site,
}: {
  site: any; // TODO: type this
}) {
  /* const syncStatus = await api.site.checkSyncStatus.query({ id: site.id }); */

  const url = `dev.${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${site.user!.gh_username}/${
    site.projectName
  }`;

  return (
    <div className="lg:flex lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="mb-2 text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          {site.projectName}
        </h2>
        {/* <Status syncStatus={syncStatus} /> */}
      </div>
      <div className="mt-5 flex lg:ml-4 lg:mt-0">
        <span className="block">
          <a
            href={`https://github.com/${site.gh_repository}`}
            target="_blank"
            rel="noreferrer"
          >
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <GithubIcon
                className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
              Repository
            </button>
          </a>
        </span>
        <span className="ml-3 block">
          <a
            href={
              env.NEXT_PUBLIC_VERCEL_ENV
                ? `https://${url}`
                : `http://dev.localhost:3000/@${site.user!.gh_username}/${
                    site.projectName
                  }`
            }
            target="_blank"
            rel="noreferrer"
          >
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <ArrowTopRightOnSquareIcon
                className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
              Visit
            </button>
          </a>
        </span>

        <span className="ml-3">
          <SyncSiteButton />
        </span>
      </div>
    </div>
  );
}
