"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  CalendarIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { NavTitle } from "../nav-title";
import TreeView, { TreeViewItem } from "../tree-view";
import { usePathname } from "next/navigation";
import TableOfContentsSidebar from "../table-of-content";

export function Sidebar({
  title,
  logo,
  url,
  className = "",
  navigation,
}: {
  title: string;
  logo: string;
  url: string;
  className?: string;
  navigation: Array<TreeViewItem>;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
        <div className="mt-8 flex h-16 shrink-0 items-center">
          <NavTitle title={title} logo={logo} url={url} />
        </div>
        <nav className="flex flex-1 flex-col">
          <TreeView items={navigation} currentPath={pathname} />
        </nav>
      </div>
    </>
  );
}

export default function MultiColumnLayout({
  title,
  logo,
  url,
  treeItems,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!sidebarOpen) return;
    setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div>
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <Transition.Child
            as={Fragment}
            enter="transition-opacity duration-300 ease-linear"
          >
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-gray-900/50 data-[closed]:opacity-0" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="fixed inset-0 flex">
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon
                      aria-hidden="true"
                      className="h-8 w-8 text-white"
                    />
                  </button>
                </div>

                <Sidebar
                  title={title}
                  url={url}
                  logo={logo}
                  navigation={treeItems}
                />
              </Dialog.Panel>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition.Root>
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col"
        data-testid="sidebar"
      >
        <Sidebar title={title} url={url} logo={logo} navigation={treeItems} />
      </div>

      <div className="sticky right-0 top-0 z-30 flex items-center justify-end gap-x-6 px-4 pt-4 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon aria-hidden="true" className="h-8 w-8" />
        </button>
      </div>

      <main className="lg:pl-72">
        <div className="xl:pr-[235px]">
          <div className="px-4 pb-10 pt-0 sm:px-6 lg:px-8 ">{children}</div>
        </div>
      </main>

      <aside className="xl:w-90 fixed inset-y-0 right-0 hidden overflow-y-auto px-4 py-6 sm:px-2 lg:px-8 xl:block xl:w-[235px]">
        <TableOfContentsSidebar />
      </aside>
    </div>
  );
}
