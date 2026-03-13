'use client';

import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import CreateSiteModal from '@/components/dashboard/create-site-modal';

export default function CreateSiteButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1 rounded-md border border-black bg-black px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-white hover:text-black"
      >
        <PlusIcon className="h-4 w-4" />
        New Site
      </button>
      <CreateSiteModal showModal={showModal} setShowModal={setShowModal} />
    </>
  );
}
