'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SiteTabsProps {
  siteId: string;
}

export default function SiteTabs({ siteId }: SiteTabsProps) {
  const pathname = usePathname();
  const base = `/site/${siteId}`;
  const isHistory = pathname.startsWith(`${base}/history`);

  return (
    <div className="border-b border-stone-200 dark:border-zinc-700">
      <nav className="-mb-px flex space-x-8">
        <Link
          href={`${base}/settings`}
          className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium ${
            !isHistory
              ? 'border-stone-900 dark:border-zinc-100 text-stone-900 dark:text-zinc-100'
              : 'border-transparent text-stone-500 dark:text-zinc-400 hover:border-stone-300 dark:hover:border-zinc-600 hover:text-stone-700 dark:hover:text-zinc-200'
          }`}
        >
          Settings
        </Link>
        <Link
          href={`${base}/history`}
          className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium ${
            isHistory
              ? 'border-stone-900 dark:border-zinc-100 text-stone-900 dark:text-zinc-100'
              : 'border-transparent text-stone-500 dark:text-zinc-400 hover:border-stone-300 dark:hover:border-zinc-600 hover:text-stone-700 dark:hover:text-zinc-200'
          }`}
        >
          History
        </Link>
      </nav>
    </div>
  );
}
