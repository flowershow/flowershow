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

const SidebarNav = ({ title, logo, url, navigation }) => {
  const pathname = usePathname();
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
      <div className="mt-12 flex  shrink-0 items-center">
        <Link
          data-testid="nav-title"
          href={url || "/"}
          className="flex items-center space-x-2 text-xl font-extrabold text-slate-900 dark:text-white"
        >
          {logo && (
            <img src={logo} alt="Logo" className="mr-1 h-8 fill-white" />
          )}
          {title && <span>{title}</span>}
        </Link>
      </div>
      <nav className="flex flex-1 flex-col">
        <TreeView items={navigation} currentPath={pathname} />
      </nav>
    </div>
  );
};

export default function Sidebar({
  title,
  logo,
  url,
  navigation,
}: {
  title: string;
  logo: string;
  url: string;
  navigation: Array<TreeViewItem>;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <Transition show={sidebarOpen} as={Fragment}>
        <Dialog onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity duration-300 ease-linear"
          >
            <DialogBackdrop className="fixed inset-0 z-40 bg-gray-900/50 data-[closed]:opacity-0" />
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
            <div className="fixed inset-0 flex">
              <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full">
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
                <SidebarNav
                  title={title}
                  url={url}
                  logo={logo}
                  navigation={navigation}
                />
              </DialogPanel>
            </div>
          </TransitionChild>
        </Dialog>
      </Transition>
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col"
        data-testid="sidebar"
      >
        <SidebarNav
          title={title}
          url={url}
          logo={logo}
          navigation={navigation}
        />
      </div>
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
    </>
  );
}
