"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { ChevronRightIcon, GlobeIcon, MenuIcon, XIcon } from "lucide-react";

import { isDir } from "@/lib/build-site-tree";
import type { Node } from "@/lib/build-site-tree";

import { NavLink, SocialLink } from "@/components/types";
import { SearchModal } from "@/components/public/search-modal";
import { socialIcons } from "@/components/public/social-icons";
import { usePathname } from "next/navigation";

export interface Props {
  logo: string;
  url: string;
  title?: string;
  links?: NavLink[];
  siteTree?: Node[];
  social?: SocialLink[];
  showSearch?: boolean;
  searchId?: string; // ID of a collection to search in (site ID)
}

const Nav = ({
  logo,
  url,
  title,
  links,
  siteTree,
  social,
  showSearch = false,
  searchId,
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
        <nav className={clsx("site-navbar", isScrolled && "is-scrolled")}>
          <div className="site-navbar-inner">
            <Link href={url} className="site-navbar-site-title">
              <img
                className="site-navbar-site-logo"
                alt="Logo"
                src={logo}
                width={32}
                height={32}
              />
              {title && <span className="site-navbar-site-name">{title}</span>}
            </Link>
            {links && (
              <div className="site-navbar-links-container">
                {links.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="site-navbar-link"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            )}
            {showSearch && (
              <div className="site-navbar-search-container">
                <SearchModal indexId={searchId!} />
              </div>
            )}
            {social && (
              <div className="site-navbar-social-links-container">
                {social.map(({ label, href, name }) => {
                  const Icon = (label && socialIcons[label]) ?? GlobeIcon;
                  return (
                    <a
                      key={label}
                      href={href}
                      className="site-navbar-social-link"
                    >
                      <Icon className="site-navbar-social-link-icon" />
                    </a>
                  );
                })}
              </div>
            )}

            <DisclosureButton className="site-navbar-mobile-nav-button group">
              <span className="sr-only">Open main menu</span>
              <MenuIcon
                aria-hidden="true"
                className="site-navbar-mobile-nav-icon group-data-[open]:hidden"
              />
              <XIcon
                aria-hidden="true"
                className="site-navbar-mobile-nav-icon hidden group-data-[open]:block"
              />
            </DisclosureButton>
          </div>

          <DisclosurePanel transition className="mobile-nav">
            {links && (
              <div className="mobile-nav-links-container">
                {links.map((link) => (
                  <DisclosureButton
                    key={link.name}
                    as="a"
                    href={link.href}
                    className="mobile-nav-link"
                  >
                    {link.name}
                  </DisclosureButton>
                ))}
              </div>
            )}
            {social && (
              <div className="mobile-nav-social-links-container">
                {social &&
                  social.map(({ label, name, href }) => (
                    <DisclosureButton
                      key={label}
                      as="a"
                      href={href}
                      className="mobile-nav-social-link"
                    >
                      <span>{name}</span>
                    </DisclosureButton>
                  ))}
              </div>
            )}
            {/* {cta && (
              <DisclosureButton
                as="a"
                href={cta.href}
                className="block py-1 hover:font-semibold hover:text-primary-emphasis"
              >
                {cta.name}
              </DisclosureButton>
            )} */}
            {siteTree && (
              <div className="mobile-nav-tree-container">
                <TreeView items={siteTree} onLinkClick={close} />
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
  items: Node[];
  level?: number;
  onLinkClick?: () => void;
}) {
  const currentPath = usePathname();
  const isCurrent = (path: string) => currentPath === path;
  const isCurrentParent = (path: string) => currentPath?.startsWith(path);

  return (
    <ul
      className={clsx(
        level ? "mobile-nav-tree-item-children" : "mobile-nav-tree",
      )}
    >
      {items.map((item) => (
        <li className="mobile-nav-tree-item" key={item.label}>
          {isDir(item) ? (
            <Disclosure defaultOpen={isCurrentParent(item.urlPath)}>
              {({ open }) => (
                <>
                  <DisclosureButton
                    className={clsx(
                      "mobile-nav-tree-item-self is-collapsible",
                      open && "is-open",
                    )}
                  >
                    <ChevronRightIcon className="mobile-nav-tree-item-icon" />
                    <span className="mobile-nav-tree-item-text">
                      {item.label}
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
              href={item.urlPath}
              className={clsx(
                "mobile-nav-tree-item-self",
                isCurrent(item.urlPath) && "is-current",
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
