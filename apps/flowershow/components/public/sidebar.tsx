'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import clsx from 'clsx';
import { ChevronRightIcon, MenuIcon } from 'lucide-react';
import { useState } from 'react';
import SiteTree from '@/components/public/site-tree';
import type { Node } from '@/lib/build-site-tree';

interface SidebarProps {
  items: Node[];
  prefix: string;
}

/** The site contents drawer, shared by the phone subnav and the page menu button. */
function SidebarDrawer({
  items,
  open,
  onClose,
  className,
  label,
}: {
  items: Node[];
  open: boolean;
  onClose: () => void;
  className?: string;
  /** The dialog's accessible name */
  label?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={clsx('sidebar-drawer', className)}
      aria-label={label}
    >
      <DialogBackdrop className="sidebar-drawer-backdrop" />
      <DialogPanel className="sidebar-drawer-panel">
        <SiteTree items={items} />
      </DialogPanel>
    </Dialog>
  );
}

export function SidebarMobileNav({ items }: SidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      </div>

      <SidebarDrawer
        items={items}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

/** Page-owned button that opens the site contents drawer (reading layout). */
export function SiteContentsMenu({ items }: { items: Node[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="site-contents-menu-button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Site contents"
        aria-haspopup="dialog"
      >
        <MenuIcon className="site-contents-menu-icon" aria-hidden="true" />
      </button>

      <SidebarDrawer
        items={items}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className="is-page-menu"
        label="Site contents"
      />
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
