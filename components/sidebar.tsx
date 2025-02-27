"use client";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import TreeView, { TreeViewItem } from "./tree-view";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export interface Props {
  logo: string;
  url?: string;
  title?: string;
  items: TreeViewItem[];
  // TODO support other fields that Nav component support
  // links?: { name: string; href: string }[];
  // social?: { name: string; href: string; label: SocialPlatform }[];
  // cta?: { name: string; href: string };
}

export default function Sidebar({ logo, url = "/", title, items }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile navigation */}
      <Transition show={sidebarOpen} as={Fragment} data-testid="sidebar">
        <Dialog onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity duration-300 ease-linear"
          >
            <DialogBackdrop className="fixed inset-0 z-10 bg-gray-900/50 data-[closed]:opacity-0" />
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="fixed inset-0 z-50 flex">
              <DialogPanel className="relative mr-16 flex w-64 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XIcon aria-hidden="true" className="h-8 w-8 text-white" />
                  </button>
                </div>
                <SidebarNavigation
                  title={title}
                  url={url}
                  logo={logo}
                  items={items}
                />
              </DialogPanel>
            </div>
          </TransitionChild>
        </Dialog>
      </Transition>

      <div className="fixed right-0 top-0 z-30 flex items-center justify-end gap-x-6 px-4 pt-4 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <MenuIcon aria-hidden="true" className="size-6" />
        </button>
      </div>

      {/* Desktop navigation */}
      <aside
        data-testid="sidebar"
        className="sticky top-12 hidden w-64 shrink-0 lg:block"
      >
        <SidebarNavigation title={title} url={url} logo={logo} items={items} />
      </aside>
    </>
  );
}

const SidebarNavigation = ({ logo, url = "/", title, items }: Props) => {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-y-5 overflow-y-auto px-2">
      <div className="shrink-0">
        <Link href={url} className="flex flex-col items-start space-y-2">
          <Image alt="Logo" src={logo} width={40} height={40} />
          {title && (
            <span className="font-body text-[1.5rem] text-slate-900">
              {title}
            </span>
          )}
        </Link>
      </div>
      <nav className="flex flex-1 flex-col">
        <TreeView items={items} currentPath={pathname} />
      </nav>
    </div>
  );
};
