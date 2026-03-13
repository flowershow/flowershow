'use client';

import { CheckCircleIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Modal from '@/providers/modal';
import { api } from '@/trpc/react';

interface ObsidianPublishModalProps {
  siteId: string;
  siteName: string;
  siteUrl: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function ObsidianPublishModal({
  siteId,
  siteName,
  siteUrl,
  showModal,
  setShowModal,
}: ObsidianPublishModalProps) {
  const router = useRouter();
  const [received, setReceived] = useState(false);

  // Poll for content to detect when Obsidian plugin publishes
  const { data: blobPaths } = api.site.getAllBlobPaths.useQuery(
    { siteId },
    {
      enabled: showModal && !received,
      refetchInterval: 3000,
    },
  );

  useEffect(() => {
    if (blobPaths && blobPaths.length > 0) {
      setReceived(true);
    }
  }, [blobPaths]);

  const handleClose = () => {
    if (received) {
      router.push(`/site/${siteId}/settings`);
      router.refresh();
    }
    setShowModal(false);
    setTimeout(() => setReceived(false), 200);
  };

  return (
    <Modal showModal={showModal} setShowModal={handleClose}>
      <div className="w-full max-w-lg bg-white rounded-md md:border md:border-stone-200 md:shadow overflow-hidden">
        <div className="p-5 md:p-10">
          <h2 className="font-dashboard-heading text-2xl">
            Publish from Obsidian
          </h2>

          {!received ? (
            <>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-stone-200 p-4">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Step 1: Install the Flowershow plugin
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Install and enable the{' '}
                    <a
                      className="text-sky-500 hover:underline"
                      href="obsidian://show-plugin?id=flowershow"
                    >
                      Flowershow Obsidian plugin
                    </a>
                    .
                  </p>
                </div>

                <div className="rounded-lg border border-stone-200 p-4">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Step 2: Generate a Personal Access Token
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Go to your{' '}
                    <Link
                      href="/tokens"
                      target="_blank"
                      className="text-sky-500 hover:underline"
                    >
                      tokens page
                    </Link>{' '}
                    and create a new token (starts with{' '}
                    <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">
                      fs_pat_
                    </code>
                    ).
                  </p>
                </div>

                <div className="rounded-lg border border-stone-200 p-4">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Step 3: Configure the plugin
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">
                    In the Flowershow plugin settings, enter your token and set
                    the site name to{' '}
                    <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">
                      {siteName}
                    </code>
                    .
                  </p>
                </div>

                <div className="rounded-lg border border-stone-200 p-4">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Step 4: Publish your vault
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Click the Flowershow icon in the Obsidian sidebar, select
                    notes to publish, and you&apos;re done!
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <svg
                  className="h-5 w-5 flex-shrink-0 animate-spin text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm text-amber-700">
                  Waiting for content upload...
                </p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500" />
              <p className="mt-3 text-sm font-medium text-stone-900">
                Your site is live!
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Your initial publish is complete. You can continue authoring in
                Obsidian and publish again anytime you make changes.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 md:px-10 gap-3">
          {received ? (
            <>
              <a
                href={siteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 flex-1 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition-all hover:bg-stone-50"
              >
                View site
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 flex-1 items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white transition-all hover:bg-white hover:text-black"
              >
                Go to site settings
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
