import { Site } from "@prisma/client";
import Link from "next/link";
import { env } from "@/env.mjs";
import Star from "@/components/icons/star";

export default function SiteCard({
  data: site,
  username,
}: {
  data: Site;
  username: string;
}) {
  let url: string;

  if (env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    if (site.customDomain) {
      url = `https://${site.customDomain}`;
    } else {
      url = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
    }
  } else if (env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
    url = `https://staging-${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
  } else {
    url = `http://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
  }

  const displayedUrl =
    site.customDomain ?? new URL(url).pathname.replace(/^\/+/, "");

  return (
    <div className="relative rounded-lg border border-stone-200 pb-10 shadow-md transition-all hover:shadow-xl dark:border-stone-700 dark:hover:border-white">
      {site.plan === "PREMIUM" && (
        <div className="absolute right-2 top-2 text-yellow-500">
          <Star className="h-5 w-5" />
        </div>
      )}
      <Link
        href={`/site/${site.id}/settings`}
        className="flex flex-col overflow-hidden rounded-lg"
      >
        <div className="p-4">
          <h3 className="my-0 truncate font-cal text-xl font-bold tracking-wide dark:text-white">
            {site.projectName}
          </h3>
        </div>
      </Link>
      <div className="absolute bottom-4 flex w-full justify-between space-x-4 px-4">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="truncate rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
        >
          {displayedUrl} ↗
        </a>
      </div>
    </div>
  );
}
