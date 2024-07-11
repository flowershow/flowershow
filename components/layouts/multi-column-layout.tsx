"use client";

import { useEffect, useState } from "react";
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
import { TocSection, collectHeadings } from "@portaljs/core";
import { useRouter } from "next/router";

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
    <div className="sidebar">
      <div className=" flex h-16 shrink-0 items-center">
        <NavTitle title={title} logo={logo} url={url} />
      </div>
      <nav className="flex flex-1 flex-col">
        <TreeView items={navigation} currentPath={pathname} />
      </nav>
    </div>
  );
}

export default function MultiColumnLayout({
  title,
  logo,
  url,
  treeItems,

  children,
}) {
  const currentPath = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  return (
    <div>
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
      >
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0" />

        <div className="fixed inset-0 flex">
          <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="-m-2.5 p-2.5"
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon aria-hidden="true" className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
              <Sidebar
                title={title}
                url={url}
                logo={logo}
                navigation={treeItems}
              />
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <div className="flex min-h-full flex-col">
        <div className="mx-auto flex w-full w-full max-w-8xl items-start gap-x-8 px-4  sm:px-6 lg:px-8 xl:min-w-[1264px] xl:max-w-[85%]">
          {/*sidebar control*/}
          <div className="fixed right-0 top-0 z-30 flex items-center justify-end gap-x-6 px-4 pt-4 sm:px-6 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon aria-hidden="true" className="h-7 w-7" />
            </button>
          </div>
          {/*sticky sidebar*/}
          <aside className="sticky top-0 hidden h-[100vh] w-44 shrink-0 overflow-y-auto border-r border-stone-200 py-10  lg:block ">
            <Sidebar
              title={title}
              url={url}
              logo={logo}
              navigation={treeItems}
            />
          </aside>
          {/*page content*/}
          <main className="flex-1 pb-10">{children}</main>
          {/*toc*/}
          <aside className="sticky top-0 hidden h-[100vh] w-[200px] shrink-0 overflow-y-auto px-2 py-10 xl:block">
            <TableOfContentsSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}
