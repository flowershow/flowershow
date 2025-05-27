"use client";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSelectedLayoutSegments } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { ExternalLinkIcon, HandshakeIcon } from "lucide-react";
import {
  Disclosure,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { getConfig } from "@/lib/app-config";
import { signOut } from "next-auth/react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

const config = getConfig();

export default function Nav({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const { id } = useParams() as { id: string };

  const { data: site } = api.site.getById.useQuery(
    { id },
    {
      enabled: !!id,
    },
  );

  const pages = useMemo(() => {
    if (segments[0] === "site" && id && site) {
      return [
        {
          name: site.projectName,
          href: `/site/${id}/settings`,
          current: true,
        },
      ];
    }
    return [];
  }, [segments, id]);

  return (
    <Disclosure as="nav" className="sticky top-0 z-50 bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <ol role="list" className="flex items-center space-x-2">
              <li>
                <Link href="/" className="flex items-center">
                  <Image
                    src={config.logo}
                    width={24}
                    height={24}
                    alt={config.product}
                  />
                  {config.product === "flowershow" && (
                    <span
                      className={cn(
                        "text-md ml-2 font-extrabold sm:text-xl",
                        pages.length && "hidden",
                      )}
                    >
                      Flowershow
                    </span>
                  )}
                </Link>
              </li>
              {pages.map((page) => (
                <li key={page.name}>
                  <div className="flex items-center">
                    <svg
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0 text-gray-300"
                    >
                      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                    </svg>
                    <a
                      href={page.href}
                      aria-current={page.current ? "page" : undefined}
                      className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      {page.name}
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="ml-6 flex items-center">
            {config.product === "flowershow" && (
              <Link
                className="flex items-center text-sm hover:underline"
                href="https://github.com/orgs/flowershow/discussions"
                target="_blank"
              >
                <span>Feedback | Support</span>
                <ExternalLinkIcon className="h-4" />
              </Link>
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
                  <button
                    onClick={() => signOut()}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none"
                  >
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>
    </Disclosure>
  );
}

function isDefined<T>(value: T | null | undefined): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
