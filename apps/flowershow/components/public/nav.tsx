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
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SearchModal } from '@/components/public/search-modal';
import { socialIcons } from '@/components/public/social-icons';
import {
  isNavDropdown,
  type NavItem,
  type NavLink,
  type SocialLink,
} from '@/components/types';
import type { Node } from '@/lib/build-site-tree';
import { isDir } from '@/lib/build-site-tree';
import { isEmoji } from '@/lib/is-emoji';
import ThemeSwitch from './theme-switch';

export interface Props {
  logo: string;
  url: string;
  title?: string;
  links?: NavItem[];
  social?: SocialLink[];
  showThemeSwitch?: boolean;
  showSearch?: boolean;
  searchId?: string; // ID of a collection to search in (site ID)
  cta?: NavLink;
}

/** True once the page has scrolled (drives the navbar's scroll shadow). */
function useIsScrolled() {
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

  return isScrolled;
}

const Nav = ({
  logo,
  url,
  title,
  links,
  social,
  showThemeSwitch = true,
  showSearch = false,
  searchId,
  cta,
}: Props) => {
  const isScrolled = useIsScrolled();

  return (
    <Disclosure>
      {({ open, close }) => (
        <nav
          className={clsx('site-navbar', isScrolled && 'is-scrolled')}
          aria-label="Main"
        >
          {/* Desktop Navigation */}
          <div className="site-navbar-inner">
            <Link href={url} className="site-navbar-site-title">
              {isEmoji(logo) ? (
                <span
                  className="site-navbar-site-logo"
                  aria-label="Logo"
                  role="img"
                >
                  {logo}
                </span>
              ) : (
                <Image
                  className="site-navbar-site-logo"
                  alt="Logo"
                  src={logo}
                  width={32}
                  height={32}
                />
              )}
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
                {social.map(({ label, href }) => {
                  if (!href) return null;
                  const Icon = (label && socialIcons[label]) || GlobeIcon;
                  return (
                    <a
                      key={href}
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
                  social.map(({ label, name, href }) => {
                    if (!href) return null;
                    return (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mobile-nav-social-link"
                      >
                        {name}
                      </a>
                    );
                  })}
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

/**
 * Close every open `<details>` menu in `container`, except the one(s)
 * containing `keep`. When focus was inside a closed menu, it moves to that
 * menu's `<summary>` so keyboard users aren't left on a hidden element.
 */
function closeDetailsMenus(container: HTMLElement, keep?: Element | null) {
  for (const details of container.querySelectorAll('details[open]')) {
    if (keep && details.contains(keep)) continue;
    const hadFocus = details.contains(document.activeElement);
    details.removeAttribute('open');
    if (hadFocus) details.querySelector('summary')?.focus();
  }
}

export interface CustomNavbarProps {
  /** Rendered `_navbar.html` (Premium). */
  content: ReactNode;
  showThemeSwitch?: boolean;
  showSearch?: boolean;
  searchId?: string;
}

/**
 * The navbar shell (sticky `<nav class="site-navbar">`, `--navbar-height`,
 * scroll shadow, `showNavbar: false` hiding) with the site's `_navbar.html`
 * as its content, replacing the config-driven logo, title, links, dropdowns,
 * social links, CTA and mobile menu. Search and the dark-mode toggle are kept
 * when the site enables them.
 *
 * `<details>` elements are the supported no-JS dropdown / mobile menu. The
 * navbar lives in the layout and survives client navigation, so open menus
 * are closed on route change, on a link click inside them, on Escape and on a
 * click outside.
 */
export function CustomNavbar({
  content,
  showThemeSwitch = false,
  showSearch = false,
  searchId,
}: CustomNavbarProps) {
  const isScrolled = useIsScrolled();
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) closeDetailsMenus(contentRef.current);
  }, [pathname]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const onPointerDown = (e: PointerEvent) => {
      closeDetailsMenus(container, e.target as Element | null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetailsMenus(container);
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a');
      if (link?.closest('details[open]')) closeDetailsMenus(container);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    container.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <nav
      className={clsx(
        'site-navbar site-navbar--custom',
        isScrolled && 'is-scrolled',
      )}
      aria-label="Main"
    >
      <div className="site-navbar-inner">
        <div ref={contentRef} className="site-navbar-custom">
          {content}
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
      </div>
    </nav>
  );
}

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
        className={clsx(
          'site-navbar-link',
          'site-navbar-dropdown-trigger',
          isOpen && 'is-open',
        )}
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
