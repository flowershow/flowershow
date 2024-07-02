"use client";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import TreeView, { TreeViewItem } from "./tree-view";
import { NavTitle } from "./nav-title";

/* const externalLinks = [
 *   {
 *         name: "Join our discord",
 *         href: "https://discord.com/invite/KrRzMKU",
 *         icon: <Bot width={18} />,
 *     },
 * ]; */

export default function Sidebar({
  treeItems,
  title,
  logo,
  url,
}: {
  treeItems: TreeViewItem[];
  title: string;
  logo: string;
  url: string;
}) {
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setShowSidebar(false);
    }
  };

  useEffect(() => {
    {
      showSidebar
        ? document.addEventListener("click", handleClickOutside)
        : document.removeEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showSidebar]);

  return (
    <>
      <button
        className="fixed right-5 top-7 z-20 lg:hidden"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <Menu width={48} height={32} className="dark:text-white" />
      </button>
      <div
        ref={sidebarRef}
        data-testid="sidebar"
        className={`transform ${
          showSidebar ? "w-[19rem] translate-x-0" : "hidden -translate-x-full"
        } fixed inset-0 left-[max(0px,calc(50%-45rem))] right-auto z-10 h-full flex-col justify-between space-y-4 overflow-y-auto border-r border-stone-200 bg-background p-4 pb-10 pl-8 pr-6 transition-all dark:border-stone-700 dark:bg-stone-900 sm:translate-x-0 lg:top-12 lg:block lg:w-[19rem]`}
      >
        <NavTitle title={title} logo={logo} url={url} />
        <div className="relative lg:text-sm lg:leading-6">
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
