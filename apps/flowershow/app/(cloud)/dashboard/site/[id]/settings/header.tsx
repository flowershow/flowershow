'use client';

import {
  CircleCheckIcon,
  LoaderCircleIcon,
  RocketIcon,
  SquareArrowOutUpRight,
  StarIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { GithubIcon } from '@/components/icons';
import { getRepoFullName } from '@/lib/get-repo-full-name';
import { getSiteUrl } from '@/lib/get-site-url';
import { FullSite } from '@/server/api/types';
import { api } from '@/trpc/react';

export default function SiteSettingsHeader({ site }: { site: FullSite }) {
  const searchParams = useSearchParams();
  const publishJustStarted = searchParams.get('publishStarted') === '1';

  const { data } = api.site.getLatestPublishState.useQuery(
    { id: site.id },
    { refetchInterval: 10 * 1000, keepPreviousData: true },
  );

  const isUnpublished = !data
    ? false
    : publishJustStarted
      ? false
      : data.isUnpublished;
  const isInProgress = !data
    ? publishJustStarted
    : data.isInProgress || (publishJustStarted && data.isUnpublished);

  const visitDisabled = data ? !data.hasLiveContent : publishJustStarted;

  const url = getSiteUrl(site);
  const repoFullName = getRepoFullName(site);

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50/60 dark:bg-zinc-950/60 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-bold leading-7 text-gray-900 dark:text-zinc-100 sm:text-2xl sm:tracking-tight">
              <span data-testid="site-name" className="font-dashboard-heading">
                {site.projectName}
              </span>
            </h2>
            {site.plan === 'PREMIUM' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-pink-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <StarIcon className="h-3 w-3" aria-hidden="true" />
                Premium
              </span>
            )}
          </div>

          <div
            data-testid="publish-status"
            className="mt-3 flex flex-wrap items-center divide-x divide-stone-300 dark:divide-zinc-700 text-sm text-stone-500 dark:text-zinc-400"
          >
            <span className="pr-3">
              {isUnpublished ? (
                <a
                  href="./welcome"
                  className="inline-flex items-center gap-1.5 font-medium text-pink-600 dark:text-pink-400 hover:underline"
                >
                  <RocketIcon className="h-4 w-4" aria-hidden="true" />
                  Publish your first content
                </a>
              ) : isInProgress ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400"
                >
                  <LoaderCircleIcon
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Publishing…
                </span>
              ) : data ? (
                <span className="inline-flex items-center gap-1.5">
                  <CircleCheckIcon
                    className="h-4 w-4 text-emerald-500 dark:text-green-400"
                    aria-hidden="true"
                  />
                  Published{' '}
                  {data.lastPublishedAt
                    ? new Date(data.lastPublishedAt).toLocaleString()
                    : ''}
                </span>
              ) : (
                <span>—</span>
              )}
            </span>

            {repoFullName && (
              <Link
                href={`https://github.com/${repoFullName}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 pl-3 hover:text-stone-700 dark:hover:text-zinc-200 hover:underline"
              >
                <GithubIcon
                  className="h-4 w-4 text-stone-400 dark:text-zinc-500"
                  aria-hidden="true"
                />
                {repoFullName}
              </Link>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {visitDisabled ? (
            <button
              type="button"
              disabled
              data-testid="visit-button"
              title="Your site is still publishing — you can visit it once the first publish finishes."
              className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md bg-stone-300 px-4 py-2 text-sm font-semibold text-white shadow-sm dark:bg-zinc-700 dark:text-zinc-400 sm:w-auto"
            >
              <SquareArrowOutUpRight className="h-4 w-4" aria-hidden="true" />
              Visit
            </button>
          ) : (
            <a
              href={url}
              data-testid="visit-button"
              target="_blank"
              rel="noreferrer"
            >
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100 sm:w-auto"
              >
                <SquareArrowOutUpRight className="h-4 w-4" aria-hidden="true" />
                Visit
              </button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
