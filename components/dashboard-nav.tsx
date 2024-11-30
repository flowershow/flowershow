"use client";
import Image from "next/image";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useSelectedLayoutSegments,
} from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Menu,
  Settings,
  FileCode,
  Megaphone,
  Layout,
} from "lucide-react";

import config from "@/config.json";

const externalLinks = config.dashboardSidebar.links
  .map((link) => {
    if (!link.href) return null;

    let icon;
    switch (link.type) {
      case "discord":
        icon = <Bot width={18} />;
        break;
      case "demo":
        icon = <Layout width={18} />;
        break;
      case "announcement":
        icon = <Megaphone width={18} />;
        break;
      case "guide":
      default:
        icon = <FileCode width={18} />;
    }
    return {
      ...link,
      icon,
    };
  })
  .filter(isDefined);

export default function Nav({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const { id } = useParams() as { id?: string };

  /* const [siteId, setSiteId] = useState<string | null>(); */

  /* useEffect(() => {
   *     if (segments[0] === "post" && id) {
   *         getSiteFromPostId(id).then((id) => {
   *             setSiteId(id);
   *         });
   *     }
   * }, [segments, id]); */

  const tabs = useMemo(() => {
    if (segments[0] === "site" && id) {
      return [
        {
          name: "Back to All Sites",
          href: "/sites",
          icon: <ArrowLeft width={18} />,
        },
        /* {
         *     name: "Analytics",
         *     href: `/site/${id}/analytics`,
         *     isActive: segments.includes("analytics"),
         *     icon: <BarChart3 width={18} />,
         * }, */
        {
          name: "Settings",
          href: `/site/${id}/settings`,
          isActive: segments.includes("settings"),
          icon: <Settings width={18} />,
        },
      ];
    }
    /* else if (segments[0] === "post" && id) {
     *     return [
     *         {
     *             name: "Back to All Posts",
     *             href: siteId ? `/site/${siteId}` : "/sites",
     *             icon: <ArrowLeft width={18} />,
     *         },
     *         {
     *             name: "Editor",
     *             href: `/post/${id}`,
     *             isActive: segments.length === 2,
     *             icon: <Edit3 width={18} />,
     *         },
     *         {
     *             name: "Settings",
     *             href: `/post/${id}/settings`,
     *             isActive: segments.includes("settings"),
     *             icon: <Settings width={18} />,
     *         },
     *     ];
     * } */
    return [
      /* {
       *     name: "Overview",
       *     href: "/",
       *     isActive: segments.length === 0,
       *     icon: <LayoutDashboard width={18} />,
       * }, */
      /* {
       *     name: "Sites",
       *     href: "/sites",
       *     isActive: segments[0] === "sites",
       *     icon: <Globe width={18} />,
       * }, */
      /* {
       *     name: "Settings",
       *     href: "/settings",
       *     isActive: segments[0] === "settings",
       *     icon: <Settings width={18} />,
       * }, */
    ];
    /* }, [segments, id, siteId]); */
  }, [segments, id]);

  const [showSidebar, setShowSidebar] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    // hide sidebar on path change
    setShowSidebar(false);
  }, [pathname]);

  return (
    <>
      <button
        className={`fixed z-20 ${
          // left align for Editor, right align for other pages
          segments[0] === "post" && segments.length === 2 && !showSidebar
            ? "left-5 top-5"
            : "right-5 top-7"
        } sm:hidden`}
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <Menu width={48} height={32} className="dark:text-white" />
      </button>
      <div
        className={`transform ${
          showSidebar ? "w-full translate-x-0" : "-translate-x-full"
        } fixed z-10 flex h-full flex-col justify-between border-r border-stone-200 bg-stone-100 p-4 transition-all dark:border-stone-700 dark:bg-stone-900 sm:w-60 sm:translate-x-0`}
      >
        <div className="grid gap-2">
          <Link
            href="/"
            className="rounded-lg p-2 hover:bg-stone-200 dark:hover:bg-stone-700"
          >
            <Image
              src={config.logo}
              width={24}
              height={24}
              alt="Logo"
              className="dark:scale-110 dark:rounded-full dark:border dark:border-stone-400"
            />
          </Link>
          <div className="grid gap-1">
            {tabs.map(({ name, href, isActive, icon }) => (
              <Link
                key={name}
                href={href}
                className={`flex items-center space-x-3 ${
                  isActive ? "bg-stone-200 text-black dark:bg-stone-700" : ""
                } rounded-lg px-2 py-1.5 transition-all duration-150 ease-in-out hover:bg-stone-200 active:bg-stone-300 dark:text-white dark:hover:bg-stone-700 dark:active:bg-stone-800`}
              >
                {icon}
                <span className="text-sm font-medium">{name}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="grid gap-1">
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
          </div>
          <div className="my-2 border-t border-stone-200 dark:border-stone-700" />
          {children}
        </div>
      </div>
    </>
  );
}

function isDefined<T>(value: T | null | undefined): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
