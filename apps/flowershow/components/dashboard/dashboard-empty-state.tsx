'use client';

import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import CreateSiteModal from '@/components/dashboard/create-site-modal';

export default function DashboardEmptyState() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div className="rounded-full bg-stone-100 dark:bg-zinc-800 p-4">
        <PlusIcon className="h-8 w-8 text-stone-400 dark:text-zinc-500" />
      </div>
      <h2 className="mt-6 font-dashboard-heading text-2xl">
        Create your first site
      </h2>
      <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-zinc-400">
        Publish your markdown, notes, or docs as a beautiful website in seconds.
      </p>
      <button
        onClick={() => setShowCreateModal(true)}
        className="mt-6 flex items-center gap-2 rounded-md border border-black bg-black px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        <PlusIcon className="h-4 w-4" />
        Create New Site
      </button>
      <CreateSiteModal
        showModal={showCreateModal}
        setShowModal={setShowCreateModal}
      />
    </div>
  );
}
