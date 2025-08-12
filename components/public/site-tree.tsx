"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { ChevronRightIcon } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TreeViewItem {
  id: string;
  label: string;
  path: string;
  children?: TreeViewItem[];
}

function TreeView({
  items,
  level = 0,
}: {
  items: TreeViewItem[];
  level?: number;
}) {
  const currentPath = usePathname();
  const isCurrent = (path: string) => currentPath === path;
  const isCurrentParent = (path: string) => currentPath?.startsWith(path);

  return (
    <ul className={clsx(level ? "site-tree-item-children" : "site-tree")}>
      {items.map((item) => (
        <li key={item.label} className="site-tree-item">
          {item.children ? (
            <Disclosure defaultOpen={isCurrentParent(item.path!)}>
              {({ open }) => (
                <>
                  <DisclosureButton
                    className={clsx(
                      "site-tree-item-self is-collapsible",
                      open && "is-open",
                    )}
                  >
                    <ChevronRightIcon className="site-tree-item-icon" />
                    <span className="site-tree-item-text">
                      {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                    </span>
                  </DisclosureButton>
                  <DisclosurePanel>
                    <TreeView items={item.children!} level={level + 1} />
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          ) : (
            <Link
              href={item.path!}
              className={clsx(
                "site-tree-item-self",
                isCurrent(item.path) && "is-current",
              )}
            >
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function SiteTree({
  items,
  level = 0,
}: {
  items: TreeViewItem[];
  level?: number;
}) {
  return (
    <nav className="site-tree-container">
      <TreeView items={items} level={level} />
    </nav>
  );
}
