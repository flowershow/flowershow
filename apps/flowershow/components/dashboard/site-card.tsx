import { Site } from '@prisma/client';
import Link from 'next/link';
import Star from '@/components/icons/star';
import { env } from '@/env.mjs';

export default function SiteCard({
  data: site,
  username,
}: {
  data: Site;
  username: string;
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
    url = `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${username}/${site.projectName}`;
  }

  const displayedUrl =
    site.customDomain || new URL(url).pathname.replace(/^\/+/, '');

  return (
    <div className="relative rounded-lg border border-stone-200 pb-10 shadow-md transition-all hover:shadow-xl  ">
      {site.plan === 'PREMIUM' && (
        <div className="absolute right-2 top-2 text-yellow-500">
          <Star className="h-5 w-5" />
        </div>
      )}
      <Link
        href={`/site/${site.id}/settings`}
        className="flex flex-col overflow-hidden rounded-lg"
      >
        <div className="p-4">
          <h3 className="my-0 truncate font-dashboard-heading text-xl font-bold tracking-wide ">
            {site.projectName}
          </h3>
        </div>
      </Link>
      <div className="absolute bottom-4 flex w-full justify-between space-x-4 px-4">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="truncate rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200   "
        >
          {displayedUrl} ↗
        </a>
      </div>
    </div>
  );
}
