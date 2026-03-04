'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { ChevronRightIcon, MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import SiteTree from '@/components/public/site-tree';
import { isDir, isFile, type Node } from '@/lib/build-site-tree';

interface SidebarProps {
  items: Node[];
  prefix: string;
}

interface Breadcrumb {
  label: string;
  /** Set when the dir has an index/README page, null otherwise */
  href: string | null;
}

/** Check if a directory has a child file served at the same URL (index/README) */
function dirHasIndexPage(node: Node): boolean {
  return (
    isDir(node) &&
    node.children.some((c) => isFile(c) && c.urlPath === node.urlPath)
  );
}

/** Walk the tree to find breadcrumb trail to the current page */
function findBreadcrumbs(items: Node[], targetPath: string): Breadcrumb[] {
  for (const item of items) {
    if (item.urlPath === targetPath || item.urlPath + '/' === targetPath) {
      return [
        {
          label: item.label,
          href: isFile(item)
            ? item.urlPath
            : dirHasIndexPage(item)
              ? item.urlPath
              : null,
        },
      ];
    }
    if (isDir(item)) {
      const found = findBreadcrumbs(item.children, targetPath);
      if (found.length > 0) {
        return [
          {
            label: item.label,
            href: dirHasIndexPage(item) ? item.urlPath : null,
          },
          ...found,
        ];
      }
    }
  }
  return [];
}

export function SidebarMobileNav({ items }: SidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  const breadcrumbs = findBreadcrumbs(items, pathname);

  return (
    <>
      <div className="site-subnav">
        <button
          type="button"
          className="site-subnav-menu-button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open sidebar"
        >
          <ChevronRightIcon className="site-subnav-menu-icon" />
        </button>
        {breadcrumbs.length > 0 && (
          <div className="site-subnav-breadcrumbs">
            {breadcrumbs.map((crumb, i) => (
              <span
                key={crumb.href ?? crumb.label}
                className="site-subnav-breadcrumb-item"
              >
                {i > 0 && (
                  <ChevronRightIcon className="site-subnav-separator" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="site-subnav-breadcrumb-link"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className="sidebar-drawer"
      >
        <DialogBackdrop className="sidebar-drawer-backdrop" />
        <DialogPanel className="sidebar-drawer-panel">
          <SiteTree items={items} />
        </DialogPanel>
      </Dialog>
    </>
  );
}

export function SidebarDesktop({ items }: { items: Node[] }) {
  return (
    <aside className="site-sidebar">
      <SiteTree items={items} />
    </aside>
  );
}
