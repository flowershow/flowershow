'use client';

import { useState } from 'react';
import ImportFilesModal from './import-files-modal';

export default function FileUploadCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative block rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-gray-500 hover:border-gray-400 transition-colors w-full text-left"
      >
        <div className="flex justify-center pb-4">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Import files</h3>
          <p className="text-xs leading-relaxed text-gray-600">
            Upload markdown files with images and assets to create a new site.
          </p>
        </div>
      </button>

      <ImportFilesModal showModal={showModal} setShowModal={setShowModal} />
    </>
  );
}
