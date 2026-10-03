'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SiteTabsProps {
  siteId: string;
  /** Open annotations, shown as a count on the Annotations tab. */
  openAnnotations?: number;
}

export default function SiteTabs({
  siteId,
  openAnnotations = 0,
}: SiteTabsProps) {
  const pathname = usePathname();
  const base = `/site/${siteId}`;
  const tabs = [
    { href: `${base}/settings`, label: 'Settings' },
    { href: `${base}/history`, label: 'History' },
    {
      href: `${base}/annotations`,
      label:
        openAnnotations > 0
          ? `Annotations (${openAnnotations})`
          : 'Annotations',
    },
  ];
  const activeHref =
    tabs.find(
      (tab) => tab.href !== `${base}/settings` && pathname.startsWith(tab.href),
    )?.href ?? `${base}/settings`;

  return (
    <div className="border-b border-stone-200 dark:border-zinc-700">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium ${
              tab.href === activeHref
                ? 'border-stone-900 dark:border-zinc-100 text-stone-900 dark:text-zinc-100'
                : 'border-transparent text-stone-500 dark:text-zinc-400 hover:border-stone-300 dark:hover:border-zinc-600 hover:text-stone-700 dark:hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
