'use client';
import {
  Disclosure,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import { CheckIcon, ChevronsUpDownIcon, ExternalLinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSelectedLayoutSegments } from 'next/navigation';
import { signOut } from 'next-auth/react';
import posthog from 'posthog-js';
import { ReactNode, useMemo } from 'react';
import FeedbackModal from '@/components/dashboard/feedback';
import { env } from '@/env.mjs';
import { getConfig } from '@/lib/app-config';
import { useModal } from '@/providers/modal-provider';
import { api } from '@/trpc/react';

const config = getConfig();

// Only expose the feedback button when a PostHog survey id is configured.
const feedbackEnabled = !!env.NEXT_PUBLIC_POSTHOG_FEEDBACK_SURVEY_ID;

export default function Nav({ children }: { children: ReactNode }) {
  const modal = useModal();
  const segments = useSelectedLayoutSegments();
  const { id } = useParams() as { id: string };

  const isSiteContext = segments[0] === 'site' && !!id;

  // All of the user's sites, for the project switcher. This one query also
  // supplies the current site's name (the switcher button label), so there's
  // nothing to re-fetch when you switch between sites. A long staleTime keeps
  // it cached across navigations instead of reloading every time.
  const { data: sites } = api.user.getSites.useQuery(
    {},
    {
      enabled: isSiteContext,
      staleTime: 5 * 60 * 1000,
    },
  );

  const currentSite = sites?.find((s) => s.id === id);

  const sortedSites = useMemo(
    () =>
      [...(sites ?? [])].sort((a, b) =>
        a.projectName.localeCompare(b.projectName),
      ),
    [sites],
  );

  return (
    <Disclosure
      as="nav"
      className="sticky top-0 z-50 bg-white text-base font-normal shadow"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="flex items-center space-x-2 text-lg font-semibold tracking-tight text-primary-strong md:text-xl"
            >
              <Image src={config.logo} width={32} height={32} alt="Logo" />
            </Link>
            {isSiteContext && (
              <div className="flex min-w-0 items-center">
                <svg
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-6 w-6 shrink-0 text-gray-300"
                >
                  <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                </svg>
                {/* Project switcher */}
                <Menu as="div" className="relative ml-2 min-w-0 sm:ml-4">
                  <MenuButton className="flex max-w-[10rem] items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:max-w-xs">
                    <span className="truncate">
                      {currentSite?.projectName ?? 'Loading…'}
                    </span>
                    <ChevronsUpDownIcon
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-gray-400"
                    />
                  </MenuButton>
                  <MenuItems
                    transition
                    className="absolute left-0 z-10 mt-2 max-h-96 w-64 origin-top-left overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                  >
                    {sortedSites.map((s) => (
                      <MenuItem key={s.id}>
                        <Link
                          href={`/site/${s.id}/settings`}
                          aria-current={s.id === id ? 'page' : undefined}
                          className="flex w-full items-center justify-between gap-2 px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none"
                        >
                          <span className="truncate">{s.projectName}</span>
                          {s.id === id && (
                            <CheckIcon
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 text-pink-600"
                            />
                          )}
                        </Link>
                      </MenuItem>
                    ))}
                    <div className="my-1 border-t border-gray-100" />
                    <MenuItem>
                      <Link
                        href="/"
                        className="block w-full px-4 py-2 text-sm font-medium text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none"
                      >
                        View all sites
                      </Link>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            )}
          </div>
          <div className="ml-6 flex items-center space-x-2">
            <Link
              className="hidden items-center text-sm hover:underline sm:flex"
              href="https://flowershow.app/docs"
              target="_blank"
            >
              <span>Docs</span>
              <ExternalLinkIcon className="h-4" />
            </Link>
            <Link
              className="hidden items-center text-sm hover:underline sm:flex"
              href="https://discord.gg/JChzM5VdFn"
              target="_blank"
            >
              <span>Support</span>
              <ExternalLinkIcon className="h-4" />
            </Link>
            {feedbackEnabled && (
              <button
                type="button"
                className="hidden rounded-md bg-pink-50 px-2.5 py-1.5 text-sm font-semibold text-pink-600 shadow-sm hover:bg-pink-100 sm:block"
                onClick={() => modal?.show(<FeedbackModal />)}
              >
                Send feedback
              </button>
            )}
            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-3">
              <div>
                <MenuButton className="relative flex rounded-full bg-white text-sm">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">Open user menu</span>
                  {children}
                </MenuButton>
              </div>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
              >
                <MenuItem>
                  <Link
                    href="/tokens"
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none"
                  >
                    API Tokens
                  </Link>
                </MenuItem>
                <MenuItem>
                  <Link
                    href="/settings"
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none"
                  >
                    Settings
                  </Link>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={() => {
                      posthog.reset();
                      signOut();
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none"
                  >
                    Sign out
                  </button>
                </MenuItem>
                <div className="my-1 border-t border-gray-100 sm:hidden" />
                <MenuItem>
                  <Link
                    href="https://flowershow.app/docs"
                    target="_blank"
                    className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none sm:hidden"
                  >
                    <span>Docs</span>
                    <ExternalLinkIcon className="ml-1 h-4" />
                  </Link>
                </MenuItem>
                <MenuItem>
                  <Link
                    href="https://discord.gg/JChzM5VdFn"
                    target="_blank"
                    className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none sm:hidden"
                  >
                    <span>Support</span>
                    <ExternalLinkIcon className="ml-1 h-4" />
                  </Link>
                </MenuItem>
                {feedbackEnabled && (
                  <MenuItem>
                    <button
                      type="button"
                      onClick={() => modal?.show(<FeedbackModal />)}
                      className="block w-full px-4 py-2 text-left text-sm text-pink-600 data-[focus]:bg-gray-100 data-[focus]:outline-none sm:hidden"
                    >
                      Send feedback
                    </button>
                  </MenuItem>
                )}
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>
    </Disclosure>
  );
}
