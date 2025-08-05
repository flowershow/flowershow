"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import clsx from "clsx";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { ChevronRightIcon, GlobeIcon, MenuIcon, XIcon } from "lucide-react";

import { NavLink, SocialLink } from "./types";
import { TreeViewItem } from "./site-map";
import { SearchModal } from "./search-modal";
import { socialIcons } from "./social-icons";

export interface Props {
  logo: string;
  url?: string;
  title?: string;
  links?: NavLink[];
  showSiteMap?: boolean;
  siteMap?: TreeViewItem[];
  social?: SocialLink[];
  cta?: NavLink;
  showSearch?: boolean;
  searchId?: string; // ID of a collection to search in (site ID)
  searchPrefix?: string;
}

const Nav = ({
  logo,
  url = "/",
  title,
  links,
  showSiteMap = false,
  siteMap,
  social,
  cta,
  showSearch = false,
  searchId,
  searchPrefix,
}: Props) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <Disclosure>
      {({ open, close }) => (
        <nav
          id="navbar"
          data-testid="navbar"
          className={clsx(
            "z-10 bg-inherit text-base font-normal",
            isScrolled && "shadow-sm",
            open ? "fixed inset-0 md:sticky" : "sticky top-0",
          )}
        >
          <div className={clsx("mx-auto px-4 text-sm", open && "sticky top-0")}>
            <div className="flex h-16 justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <Link
                  id="navbar-title"
                  href={url}
                  className="flex items-center space-x-3 text-lg font-semibold tracking-tight text-primary-strong md:text-xl"
                >
                  <Image alt="Logo" src={logo} width={32} height={32} />
                  {title && <span>{title}</span>}
                </Link>
                {links && (
                  <div
                    data-testid="navbar-links"
                    className="hidden space-x-4 pl-2 text-[0.95rem] font-medium tracking-tight lg:flex"
                  >
                    {links.map((link) => (
                      <a
                        key={link.name}
                        href={link.href}
                        className="inline-flex items-center px-1"
                      >
                        {link.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 grow items-center justify-end">
                {showSearch && (
                  <SearchModal indexId={searchId!} prefix={searchPrefix!} />
                )}
              </div>
              <div className="hidden lg:flex lg:items-center">
                {(social || cta) && (
                  <div
                    data-testid="navbar-socials"
                    className="flex items-center sm:ml-6"
                  >
                    {social &&
                      social.map(({ label, href, name }) => {
                        const Icon = (label && socialIcons[label]) ?? GlobeIcon;
                        return (
                          <a
                            key={label}
                            href={href}
                            className="relative p-1 focus:outline-none"
                          >
                            <span className="sr-only">{name}</span>
                            {Icon ? <Icon className="h-6 w-6" /> : name}
                          </a>
                        );
                      })}
                    {cta && (
                      <>
                        <span className="mx-2 h-6 border-r border-zinc-200" />
                        <a
                          href={cta.href}
                          className="relative p-1 focus:outline-none"
                        >
                          <span>{cta.name}</span>
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>

              {(links?.length || social?.length || siteMap?.length) && (
                <div className="-mr-2 flex items-center lg:hidden">
                  {/* Mobile menu button */}
                  <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-primary-muted hover:text-primary focus:outline-none">
                    <span className="absolute -inset-0.5" />
                    <span className="sr-only">Open main menu</span>
                    <MenuIcon
                      aria-hidden="true"
                      className="size-6 block group-data-[open]:hidden"
                    />
                    <XIcon
                      aria-hidden="true"
                      className="size-6 hidden group-data-[open]:block"
                    />
                  </DisclosureButton>
                </div>
              )}
            </div>
          </div>

          <DisclosurePanel
            as="nav"
            transition
            className="block h-[calc(100vh-4rem)] overflow-scroll overscroll-none border-b border-primary-faint lg:hidden"
          >
            {links && (
              <div className="space-y-1 py-3 font-medium">
                {links.map((link) => (
                  <DisclosureButton
                    key={link.name}
                    as="a"
                    href={link.href}
                    className="block px-4 py-1 hover:font-semibold hover:text-primary-emphasis"
                  >
                    {link.name}
                  </DisclosureButton>
                ))}
              </div>
            )}
            {(cta || social) && (
              <div className="border-t border-primary-faint py-3 font-medium">
                <div className="space-y-1 px-4">
                  {social &&
                    social.map(({ label, name, href }) => (
                      <DisclosureButton
                        key={label}
                        as="a"
                        href={href}
                        className="block flex items-center space-x-2 py-1 hover:font-semibold hover:text-primary-emphasis"
                      >
                        <span>{name}</span>
                      </DisclosureButton>
                    ))}
                  {cta && (
                    <DisclosureButton
                      as="a"
                      href={cta.href}
                      className="block py-1 hover:font-semibold hover:text-primary-emphasis"
                    >
                      {cta.name}
                    </DisclosureButton>
                  )}
                </div>
              </div>
            )}
            {showSiteMap && siteMap && (
              <div className="border-t border-primary-faint px-4 py-3 font-light">
                <TreeView items={siteMap} onLinkClick={close} />
              </div>
            )}
          </DisclosurePanel>
        </nav>
      )}
    </Disclosure>
  );
};

function TreeView({
  items,
  level = 0,
  onLinkClick,
}: {
  items: TreeViewItem[];
  level?: number;
  onLinkClick?: () => void;
}) {
  const currentPath = usePathname();
  const isCurrent = (path: string) => currentPath === path;
  const isCurrentParent = (path: string) => currentPath?.startsWith(path);

  return (
    <ul className={clsx("space-y-1 py-1", level && "pl-5")}>
      {items.map((item) => (
        <li key={item.label} className="py-1">
          {item.children ? (
            <Disclosure defaultOpen={isCurrentParent(item.path!)}>
              {({ open }) => (
                <>
                  <DisclosureButton
                    className={clsx(
                      "flex w-full items-center text-left hover:font-semibold hover:text-primary-emphasis",
                      open && "mb-1",
                    )}
                  >
                    <ChevronRightIcon
                      className={clsx(
                        "mr-1 h-4 w-4",
                        open && "rotate-90 transform",
                      )}
                    />
                    <span className="transition">
                      {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                    </span>
                  </DisclosureButton>
                  <DisclosurePanel>
                    <TreeView
                      items={item.children!}
                      level={level + 1}
                      onLinkClick={onLinkClick}
                    />
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          ) : (
            <Link
              href={item.path!}
              className={clsx(
                "transition hover:font-semibold hover:text-primary-emphasis",
                isCurrent(item.path) && "text-primary-emphasis",
              )}
              onClick={onLinkClick}
            >
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default Nav;
