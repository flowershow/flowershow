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
import { isDir, Node } from "@/lib/build-site-tree";

function TreeView({ items, level = 0 }: { items: Node[]; level?: number }) {
  const currentPath = usePathname();
  const isCurrent = (path: string) =>
    currentPath === path || currentPath === path + "/";
  const isCurrentParent = (path: string) => currentPath?.startsWith(path);

  return (
    <ul className={clsx(level ? "site-tree-item-children" : "site-tree")}>
      {items.map((item) => (
        <li key={item.label} className="site-tree-item">
          {isDir(item) ? (
            <Disclosure defaultOpen={isCurrentParent(item.urlPath)}>
              {({ open }) => (
                <>
                  <DisclosureButton
                    className={clsx(
                      "site-tree-item-self is-collapsible",
                      open && "is-open",
                    )}
                  >
                    <ChevronRightIcon className="site-tree-item-icon" />
                    <span className="site-tree-item-text">{item.label}</span>
                  </DisclosureButton>
                  <DisclosurePanel>
                    <TreeView items={item.children} level={level + 1} />
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          ) : (
            <Link
              href={item.urlPath}
              className={clsx(
                "site-tree-item-self",
                isCurrent(item.urlPath) && "is-current",
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

export default function SiteTree({ items }: { items: Node[] }) {
  return (
    <nav className="site-tree-container">
      <TreeView items={items} level={0} />
    </nav>
  );
}
