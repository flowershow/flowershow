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
    <ul className={clsx("mb-4", level && "pl-5")}>
      {items.map((item) => (
        <li key={item.label} className="my-2">
          {item.children ? (
            <Disclosure defaultOpen={isCurrentParent(item.path!)}>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center text-left hover:font-semibold hover:text-primary-emphasis">
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
                    <TreeView items={item.children!} level={level + 1} />
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
            >
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function SiteMap({
  items,
  level = 0,
}: {
  items: TreeViewItem[];
  level?: number;
}) {
  return (
    <div data-testid="sidebar" className="text-sm text-primary-subtle">
      <nav>
        <TreeView items={items} level={level} />
      </nav>
    </div>
  );
}
