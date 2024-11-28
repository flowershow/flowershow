"use client";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronRightIcon } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

export interface TreeViewItem {
  id: string;
  label: string;
  path: string;
  children?: TreeViewItem[];
}

export default function TreeView({
  items,
  currentPath,
  level = 0,
  className,
}: {
  items: TreeViewItem[];
  currentPath?: string;
  level?: number;
  className?: string;
}) {
  const isCurrent = (path: string) => currentPath === path;
  const isCurrentParent = (path: string) => currentPath?.startsWith(path);

  return (
    <ul
      role="list"
      className={clsx(className, "pb-1.5 pt-1", level > 0 && "ml-5")}
    >
      {items.map((item) => (
        <li
          key={item.label}
          className={clsx(
            "py-1",
            level > 0 &&
              "hover:text-default border-l-[1px] border-primary/30 hover:border-secondary",
          )}
        >
          {!item.children ? (
            <Link
              href={item.path!}
              className={clsx(
                "pl-3",
                "block cursor-pointer text-sm text-gray-700",
                isCurrent(item.path!) &&
                  "border-secondary font-medium text-secondary",
              )}
            >
              {item.label}
            </Link>
          ) : (
            <Disclosure as="div" defaultOpen={isCurrentParent(item.path!)}>
              {({ open }) => (
                <>
                  <Disclosure.Button
                    className={clsx(
                      "flex w-full items-center text-left text-sm font-semibold text-primary",
                    )}
                  >
                    <ChevronRightIcon
                      className={clsx(
                        open ? "rotate-90 text-gray-500" : "text-gray-400",
                        "h-5 w-5 shrink-0",
                      )}
                      aria-hidden="true"
                    />
                    {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                  </Disclosure.Button>
                  <Transition
                    enter="duration-200 ease-out"
                    enterFrom="opacity-0 -translate-y-6"
                    enterTo="opacity-100 translate-y-0"
                    leave="duration-150 ease-out"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 -translate-y-6"
                  >
                    <Disclosure.Panel className="origin-top transition">
                      <TreeView
                        items={item.children!}
                        currentPath={currentPath}
                        level={level + 1}
                      />
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          )}
        </li>
      ))}
    </ul>
  );
}
