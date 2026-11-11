import Link from 'next/link';
import Star from '@/components/icons/star';
import { env } from '@/env.mjs';
import type { DashboardSite } from '@/server/api/routers/user';

export default function SiteCard({
  data: site,
  people,
}: {
  data: DashboardSite;
  /** People in the last 30 days; undefined shows no line. */
  people?: number;
}) {
  let url: string;

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';
  if (site.customDomain) {
    url = `${protocol}://${site.customDomain}`;
  } else if (site.subdomain) {
    url = `${protocol}://${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
  } else {
    url = `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${site.ownerUsername}/${site.projectName}`;
  }

  const displayedUrl = site.customDomain || new URL(url).host;

  const ownerLine =
    site.role === 'editor' ? (
      <p className="mb-0 mt-1 flex items-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-zinc-800 dark:text-zinc-300">
          Editor
        </span>
        <span className="truncate">by {site.ownerUsername}</span>
      </p>
    ) : null;

  return (
    <div
      className={`relative rounded-lg border border-stone-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 pb-10 shadow-md transition-all hover:shadow-xl ${site.lapsed ? 'opacity-60' : ''}`}
    >
      {site.plan === 'PREMIUM' && (
        <div className="absolute right-2 top-2 text-yellow-500">
          <Star className="h-5 w-5" />
        </div>
      )}
      {site.lapsed ? (
        <div className="flex flex-col overflow-hidden rounded-lg">
          <div className="p-4">
            <h3 className="my-0 truncate font-dashboard-heading text-xl font-bold tracking-wide ">
              {site.projectName}
            </h3>
            {ownerLine}
            <p className="mb-0 mt-1 text-sm text-stone-500 dark:text-zinc-400">
              Premium lapsed, ask the owner
            </p>
          </div>
        </div>
      ) : (
        <Link
          href={`/site/${site.id}/settings`}
          className="flex flex-col overflow-hidden rounded-lg"
        >
          <div className="p-4">
            <h3 className="my-0 truncate font-dashboard-heading text-xl font-bold tracking-wide ">
              {site.projectName}
            </h3>
            {ownerLine}
          </div>
        </Link>
      )}
      {!site.lapsed && people !== undefined && (
        <Link
          href={`/site/${site.id}/analytics`}
          className="block px-4 pb-2 text-sm text-stone-500 hover:text-stone-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {people === 0
            ? 'No readers yet'
            : `${people.toLocaleString('en-US')} ${people === 1 ? 'person' : 'people'} in the last 30 days`}
        </Link>
      )}
      <div className="absolute bottom-4 flex w-full justify-between space-x-4 px-4">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="truncate rounded-md bg-stone-100 dark:bg-zinc-800 px-2 py-1 text-sm font-medium text-stone-600 dark:text-zinc-300 transition-colors hover:bg-stone-200 dark:hover:bg-zinc-700   "
        >
          {displayedUrl} ↗
        </a>
      </div>
    </div>
  );
}
