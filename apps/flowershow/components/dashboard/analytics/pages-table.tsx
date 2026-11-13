'use client';

import { useState } from 'react';
import type { PageRow } from '@/lib/site-analytics/site-analytics';
import { ShareTable } from './share-table';

const VISIBLE = 10;

export default function PagesTable({
  pages,
  totalPeople,
}: {
  pages: PageRow[];
  totalPeople: number;
}) {
  const [all, setAll] = useState(false);
  const rows = all ? pages : pages.slice(0, VISIBLE);

  return (
    <div>
      <ShareTable
        heading="Page"
        total={totalPeople}
        rows={rows.map((p) => ({
          key: p.path,
          label: p.title ?? p.path,
          href: p.href,
          people: p.people,
          views: p.views,
        }))}
      />
      {!all && pages.length > VISIBLE && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="text-sm text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Show all {pages.length} pages
          </button>
        </div>
      )}
    </div>
  );
}
