'use client';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import clsx from 'clsx';
import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isDir, isFile, type Node } from '@/lib/build-site-tree';

function dirHasIndexPage(node: Node): boolean {
  return (
    isDir(node) &&
    node.children.some((c) => isFile(c) && c.urlPath === node.urlPath)
  );
}

function TreeView({ items, level = 0 }: { items: Node[]; level?: number }) {
  const currentPath = usePathname();
  const isCurrent = (path: string) =>
    currentPath === path || currentPath === `${path}/`;
  const isCurrentParent = (path: string) => currentPath?.startsWith(path);

  return (
    <ul className={clsx(level ? 'site-tree-item-children' : 'site-tree')}>
      {items.map((item) => (
        <li key={item.label} className="site-tree-item">
          {isDir(item) ? (
            <Disclosure defaultOpen={isCurrentParent(item.urlPath)}>
              {({ open }) => (
                <>
                  {dirHasIndexPage(item) ? (
                    <div
                      className={clsx(
                        'site-tree-item-self is-collapsible',
                        open && 'is-open',
                      )}
                    >
                      <Link
                        href={item.urlPath}
                        className={clsx(
                          'site-tree-item-text',
                          isCurrent(item.urlPath) && 'is-current',
                        )}
                      >
                        {item.label}
                      </Link>
                      <DisclosureButton aria-label={`Toggle ${item.label}`}>
                        <ChevronRightIcon className="site-tree-item-icon" />
                      </DisclosureButton>
                    </div>
                  ) : (
                    <DisclosureButton
                      className={clsx(
                        'site-tree-item-self is-collapsible',
                        open && 'is-open',
                      )}
                    >
                      <span className="site-tree-item-text">{item.label}</span>
                      <ChevronRightIcon className="site-tree-item-icon" />
                    </DisclosureButton>
                  )}
                  <DisclosurePanel
                    transition
                    className="site-tree-disclosure-panel"
                  >
                    <TreeView
                      items={item.children.filter(
                        (c) => c.urlPath !== item.urlPath,
                      )}
                      level={level + 1}
                    />
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          ) : (
            <Link
              href={item.urlPath}
              className={clsx(
                'site-tree-item-self',
                isCurrent(item.urlPath) && 'is-current',
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
