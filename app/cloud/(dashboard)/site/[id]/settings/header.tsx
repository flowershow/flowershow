import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { GithubIcon } from "lucide-react";
/* import Status from "./status"; */
import SyncSiteButton from "./sync-button";
import { env } from "@/env.mjs";
import { Site } from "@prisma/client";
/* import { api } from "@/trpc/server"; */

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

export default async function SiteSettingsHeader({
  site,
}: {
  site: SiteWithUser;
}) {
  /* const syncStatus = await api.site.checkSyncStatus.query({ id: site.id }); */

  const url =
    env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? `https://dev.${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${
          site.user!.gh_username
        }/${site.projectName}`
      : env.NEXT_PUBLIC_VERCEL_ENV === "preview"
        ? `https://staging-dev.${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${
            site.user!.gh_username
          }/${site.projectName}`
        : `http://dev.${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${
            site.user!.gh_username
          }/${site.projectName}`;

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
          <a href={url} target="_blank" rel="noreferrer">
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
