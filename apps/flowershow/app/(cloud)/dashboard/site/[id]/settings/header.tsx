'use client';

import {
  CalendarIcon,
  CircleArrowDownIcon,
  CircleCheckIcon,
  RocketIcon,
  SquareArrowOutUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { GithubIcon } from '@/components/icons';
import { getRepoFullName } from '@/lib/get-repo-full-name';
import { getSiteUrl } from '@/lib/get-site-url';
import { PublicSite } from '@/server/api/types';
import { api } from '@/trpc/react';

export default function SiteSettingsHeader({ site }: { site: PublicSite }) {
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

  const url = getSiteUrl(site);
  const repoFullName = getRepoFullName(site);

  return (
    <div className="border-b border-stone-200 pb-4 sm:flex sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="mb-2 text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          <div className="flex items-center gap-2">
            <span data-testid="site-name" className="font-dashboard-heading">
              {site.projectName}
            </span>
            {site.plan === 'PREMIUM' && (
              <span className="ml-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                Premium
              </span>
            )}
          </div>
        </h2>

        {/* Publish status */}
        <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
          <div
            data-testid="publish-status"
            className="mt-2 flex items-center text-sm text-gray-500"
          >
            {isUnpublished ? (
              <a
                href={`./welcome`}
                className="flex items-center text-pink-600 hover:underline"
              >
                <RocketIcon
                  className="mr-1.5 h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>Publish your first content</span>
              </a>
            ) : isInProgress ? (
              <div className="flex items-center">
                <CircleArrowDownIcon
                  className="mr-1.5 h-5 w-5 flex-shrink-0 text-orange-400"
                  aria-hidden="true"
                />
                <span>Publishing...</span>
              </div>
            ) : data ? (
              <div className="flex items-center">
                <CalendarIcon
                  className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <span>
                  Last published{' '}
                  {data.lastPublishedAt
                    ? new Date(data.lastPublishedAt).toLocaleString()
                    : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-center">
                <CircleCheckIcon
                  className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <span>-</span>
              </div>
            )}
          </div>
        </div>

        {/* Publish method */}
        {repoFullName && (
          <Link
            href={`https://github.com/${repoFullName}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center text-sm text-gray-500 hover:underline"
          >
            <GithubIcon
              className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
            <span>{repoFullName}</span>
          </Link>
        )}
      </div>
      <div className="mt-3 flex sm:mt-0">
        <span className="ml-3 block">
          <a
            href={url}
            data-testid="visit-button"
            target="_blank"
            rel="noreferrer"
          >
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              <SquareArrowOutUpRight
                className="-ml-0.5 mr-1.5 h-5 w-5"
                aria-hidden="true"
              />
              Visit
            </button>
          </a>
        </span>
      </div>
    </div>
  );
}
