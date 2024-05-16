"use client";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import TreeView, { TreeViewItem } from "./tree-view";

const externalLinks = [
  /* {
   *     name: "Join our discord",
   *     href: "https://discord.com/invite/KrRzMKU",
   *     icon: <Bot width={18} />,
   * }, */
];

export default function Nav({ treeItems }: { treeItems: TreeViewItem[] }) {
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <>
      <button
        className="fixed right-5 top-7 z-20 sm:hidden"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <Menu width={48} height={32} className="dark:text-white" />
      </button>
      <div
        className={`transform ${
          showSidebar ? "w-full translate-x-0" : "-translate-x-full"
        } fixed z-10 flex h-full flex-col justify-between space-y-4 border-r border-stone-200 bg-background p-4 transition-all dark:border-stone-700 dark:bg-stone-900 sm:w-60 sm:translate-x-0`}
      >
        <Link
          href="/"
          className="rounded-lg p-2 hover:bg-stone-200 dark:hover:bg-stone-700"
        >
          <Image
            src="/datahub-cube.svg"
            width={24}
            height={24}
            alt="Logo"
            className="dark:scale-110 dark:rounded-full dark:border dark:border-stone-400"
          />
        </Link>
        <div className="h-full overflow-y-auto">
          <TreeView items={treeItems} currentPath={pathname} />
        </div>
        {/* <div>
                    {externalLinks.map(({ name, href, icon }) => (
                        <a
                            key={name}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-all duration-150 ease-in-out hover:bg-stone-200 active:bg-stone-300 dark:text-white dark:hover:bg-stone-700 dark:active:bg-stone-800"
                        >
                            <div className="flex items-center space-x-3">
                                {icon}
                                <span className="text-sm font-medium">{name}</span>
                            </div>
                            <p>↗</p>
                        </a>
                    ))}
                </div> */}
        {/* <div className="my-2 border-t border-stone-200 dark:border-stone-700" />
                    {children} */}
      </div>
    </>
  );
}
