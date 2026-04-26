'use client';

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import {
  CalendarIcon,
  CircleAlertIcon,
  CircleArrowDownIcon,
  CircleCheckIcon,
  FolderIcon,
  InfoIcon,
  RocketIcon,
  SquareArrowOutUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { GithubIcon } from '@/components/icons';
import { getRepoFullName } from '@/lib/get-repo-full-name';
import { getSiteUrl } from '@/lib/get-site-url';
import { PublicSite } from '@/server/api/types';
import { useSync } from '../sync-status-provider';
import SyncSiteButton from './sync-button';

export default function SiteSettingsHeader({ site }: { site: PublicSite }) {
  const syncStatus = useSync();
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const url = getSiteUrl(site);

  const repoFullName = getRepoFullName(site);
  const hasGithubRepo = !!repoFullName;

  return (
    <>
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

          {/* Sync status */}
          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div
              data-testid="sync-status"
              className="mt-2 flex items-center text-sm text-gray-500"
            >
              {syncStatus.status === 'UNPUBLISHED' ? (
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
              ) : syncStatus.status === 'LOADING' ? (
                <div className="flex items-center">
                  <CircleAlertIcon
                    className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                    aria-hidden="true"
                  />
                  <span>-</span>
                </div>
              ) : syncStatus.status === 'SUCCESS' ? (
                <div className="flex items-center">
                  <CircleCheckIcon
                    className="mr-1.5 h-5 w-5 flex-shrink-0 text-green-400"
                    aria-hidden="true"
                  />
                  <span>{hasGithubRepo ? 'Synced' : 'Published'}</span>
                </div>
              ) : syncStatus.status === 'PENDING' ? (
                <div className="flex items-center">
                  <CircleArrowDownIcon
                    className="mr-1.5 h-5 w-5 flex-shrink-0 text-orange-400"
                    aria-hidden="true"
                  />
                  <span>{hasGithubRepo ? 'Syncing...' : 'Publishing...'}</span>
                </div>
              ) : syncStatus.status === 'ERROR' ? (
                <div className="group flex items-center hover:cursor-default">
                  <CircleAlertIcon
                    className="mr-1.5 h-5 w-5 flex-shrink-0 text-red-400"
                    aria-hidden="true"
                  />
                  <Popover className="relative z-30">
                    <PopoverButton
                      onMouseEnter={() => setShowErrorDialog(true)}
                      onMouseLeave={() => setShowErrorDialog(false)}
                      className="group flex outline-none hover:text-gray-800"
                    >
                      <span>Error</span>
                      <InfoIcon
                        className="ml-1 h-5 w-5 flex-shrink-0"
                        aria-hidden="true"
                      />
                    </PopoverButton>

                    <Transition
                      show={showErrorDialog}
                      enter="transition duration-100 ease-out"
                      enterFrom="transform scale-95 opacity-0"
                      enterTo="transform scale-100 opacity-100"
                      leave="transition duration-75 ease-out"
                      leaveFrom="transform scale-100 opacity-100"
                      leaveTo="transform scale-95 opacity-0"
                    >
                      <PopoverPanel className="absolute left-1/2 flex w-screen max-w-min -translate-x-1/2 px-4">
                        <div
                          onMouseEnter={() => setShowErrorDialog(true)}
                          onMouseLeave={() => setShowErrorDialog(false)}
                          className="max-h-80 w-80 shrink overflow-y-auto rounded-xl bg-white p-4 text-sm leading-6 text-gray-900 shadow-lg ring-1 ring-gray-900/5"
                        >
                          {syncStatus && syncStatus.error}
                        </div>
                      </PopoverPanel>
                    </Transition>
                  </Popover>
                </div>
              ) : (
                <div className="flex items-center">
                  <CircleAlertIcon
                    className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                    aria-hidden="true"
                  />
                  <span>Outdated</span>
                </div>
              )}
            </div>
            {syncStatus.lastSyncedAt && (
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <CalendarIcon
                  className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <span>
                  {hasGithubRepo ? 'Last synced' : 'Last published'}{' '}
                  {syncStatus && syncStatus.lastSyncedAt
                    ? new Date(syncStatus?.lastSyncedAt)?.toLocaleString()
                    : '—'}
                </span>
              </div>
            )}
          </div>

          {/* Publish method */}
          {repoFullName ? (
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
          ) : syncStatus.status !== 'UNPUBLISHED' &&
            syncStatus.status !== 'LOADING' ? (
            <span
              className="mt-2 inline-flex items-center text-sm text-gray-500"
              title="Published via CLI, Obsidian plugin, or drag and drop"
            >
              <FolderIcon
                className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
              Direct publish
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex sm:mt-0">
          {repoFullName && <SyncSiteButton siteId={site.id} />}
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
    </>
  );
}
