'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { ChevronRightIcon, MenuIcon } from 'lucide-react';
import { useState } from 'react';
import SiteTree from '@/components/public/site-tree';
import type { Node } from '@/lib/build-site-tree';

interface SidebarProps {
  items: Node[];
  prefix: string;
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
