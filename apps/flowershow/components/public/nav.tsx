'use client';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import clsx from 'clsx';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeIcon,
  MenuIcon,
  XIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchModal } from '@/components/public/search-modal';
import { socialIcons } from '@/components/public/social-icons';
import {
  isNavDropdown,
  NavItem,
  NavLink,
  SocialLink,
} from '@/components/types';
import type { Node } from '@/lib/build-site-tree';
import { isDir } from '@/lib/build-site-tree';
import ThemeSwitch from './theme-switch';

export interface Props {
  logo: string;
  url: string;
  title?: string;
  links?: NavItem[];
  siteTree?: Node[];
  social?: SocialLink[];
  showThemeSwitch?: boolean;
  showSearch?: boolean;
  searchId?: string; // ID of a collection to search in (site ID)
  cta?: NavLink;
}

const Nav = ({
  logo,
  url,
  title,
  links,
  siteTree,
  social,
  showThemeSwitch = true,
  showSearch = false,
  searchId,
  cta,
}: Props) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <Disclosure>
      {({ open, close }) => (
        <nav className={clsx('site-navbar', isScrolled && 'is-scrolled')}>
          {/* Desktop Navigation */}
          <div className="site-navbar-inner">
            <Link href={url} className="site-navbar-site-title">
              <Image
                className="site-navbar-site-logo"
                alt="Logo"
                src={logo}
                width={32}
                height={32}
              />
              {title && <span className="site-navbar-site-name">{title}</span>}
            </Link>
            <div className="site-navbar-links-container">
              {links &&
                links.map((item) =>
                  isNavDropdown(item) ? (
                    <NavbarDropdown key={item.name} item={item} />
                  ) : (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="site-navbar-link"
                    >
                      {item.name}
                    </Link>
                  ),
                )}
            </div>
            {showSearch && (
              <div className="site-navbar-search-container">
                <SearchModal indexId={searchId!} />
              </div>
            )}
            {showThemeSwitch && (
              <div className="site-navbar-theme-switch-container">
                <ThemeSwitch />
              </div>
            )}
            {social && (
              <div className="site-navbar-social-links-container">
                {social.map(({ label, href }, index) => {
                  const Icon = (label && socialIcons[label]) || GlobeIcon;
                  return (
                    <a
                      key={`${href}-${index}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="site-navbar-social-link"
                    >
                      <Icon className="site-navbar-social-link-icon" />
                    </a>
                  );
                })}
              </div>
            )}
            {cta && (
              <Link href={cta.href} className="site-navbar-cta-button">
                {cta.name}
              </Link>
            )}

            {/* Mobile Navigation Button */}
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

          {/* Mobile Navigation */}
          <DisclosurePanel transition className="mobile-nav">
            {links && (
              <div className="mobile-nav-links-container">
                {links.map((item) =>
                  isNavDropdown(item) ? (
                    <Disclosure key={item.name}>
                      {({ open }) => (
                        <div className="mobile-nav-dropdown">
                          <DisclosureButton
                            className={clsx(
                              'mobile-nav-dropdown-trigger',
                              open && 'is-open',
                            )}
                          >
                            {item.name}
                            <ChevronRightIcon
                              className={clsx(
                                'mobile-nav-dropdown-icon',
                                open && 'is-open',
                              )}
                            />
                          </DisclosureButton>
                          <DisclosurePanel className="mobile-nav-dropdown-panel">
                            {item.links.map((link) => (
                              <a
                                key={link.name}
                                href={link.href}
                                className="mobile-nav-dropdown-item"
                              >
                                {link.name}
                              </a>
                            ))}
                          </DisclosurePanel>
                        </div>
                      )}
                    </Disclosure>
                  ) : (
                    <DisclosureButton
                      key={item.name}
                      as="a"
                      href={item.href}
                      className="mobile-nav-link"
                    >
                      {item.name}
                    </DisclosureButton>
                  ),
                )}
              </div>
            )}
            {social && (
              <div className="mobile-nav-social-links-container">
                {social &&
                  social.map(({ label, name, href }, index) => (
                    <a
                      key={`${href}-${index}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mobile-nav-social-link"
                    >
                      {name}
                    </a>
                  ))}
              </div>
            )}
            {siteTree && (
              <div className="mobile-nav-tree-container">
                <TreeView items={siteTree} onLinkClick={close} />
              </div>
            )}
            {cta && (
              <Link href={cta.href} className="mobile-nav-cta-button">
                {cta.name}
              </Link>
            )}
          </DisclosurePanel>
        </nav>
      )}
    </Disclosure>
  );
};

function NavbarDropdown({
  item,
}: {
  item: { name: string; links: NavLink[] };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as HTMLElement)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="site-navbar-dropdown"
      onMouseEnter={open}
      onMouseLeave={close}
    >
      <button
        className={clsx('site-navbar-dropdown-trigger', isOpen && 'is-open')}
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {item.name}
        <ChevronDownIcon className="site-navbar-dropdown-icon" />
      </button>
      {isOpen && (
        <div className="site-navbar-dropdown-panel" role="menu">
          {item.links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="site-navbar-dropdown-item"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
        level ? 'mobile-nav-tree-item-children' : 'mobile-nav-tree',
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
                      'mobile-nav-tree-item-self is-collapsible',
                      open && 'is-open',
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
                'mobile-nav-tree-item-self',
                isCurrent(item.urlPath) && 'is-current',
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
