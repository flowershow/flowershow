'use client';

import { useState } from 'react';
import type { PageRow } from '@/lib/site-analytics/site-analytics';
import { formatNumber } from './format';

const VISIBLE = 20;

export default function PagesTable({ pages }: { pages: PageRow[] }) {
  const [all, setAll] = useState(false);
  const rows = all ? pages : pages.slice(0, VISIBLE);

  return (
    <div>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-left text-stone-500 dark:text-zinc-400">
            <th className="pb-2 font-medium">Page</th>
            <th className="w-16 pb-2 text-right font-medium">People</th>
            <th className="w-16 pb-2 text-right font-medium">Views</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.path}
              className="border-t border-stone-100 dark:border-zinc-800"
            >
              <td className="truncate py-2 pr-3 text-stone-800 dark:text-zinc-100">
                {p.href ? (
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {p.title ?? p.path}
                  </a>
                ) : (
                  (p.title ?? p.path)
                )}
              </td>
              <td className="py-2 text-right tabular-nums text-stone-600 dark:text-zinc-300">
                {formatNumber(p.people)}
              </td>
              <td className="py-2 text-right tabular-nums text-stone-600 dark:text-zinc-300">
                {formatNumber(p.views)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!all && pages.length > VISIBLE && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="text-sm text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Show all pages
          </button>
        </div>
      )}
    </div>
  );
}
