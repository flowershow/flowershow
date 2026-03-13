'use client';

import { CheckCircleIcon, CheckIcon, CopyIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Modal from '@/providers/modal';
import { api } from '@/trpc/react';

function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = command;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative mt-2">
      <pre className="overflow-x-auto rounded bg-stone-50 p-3 pr-10 text-xs text-stone-700">
        {command}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
        aria-label="Copy command"
      >
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

interface CliPublishModalProps {
  siteId: string;
  siteName: string;
  siteUrl: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function CliPublishModal({
  siteId,
  siteName,
  siteUrl,
  showModal,
  setShowModal,
}: CliPublishModalProps) {
  const router = useRouter();
  const [received, setReceived] = useState(false);

  // Poll for content to detect when CLI publishes
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
          <h2 className="font-dashboard-heading text-2xl">Publish from CLI</h2>

          {!received ? (
            <>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-stone-200 p-4">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Step 1: Install the CLI
                  </h3>
                  <CopyableCommand command="npm install -g @flowershow/publish@latest" />
                </div>

                <div className="rounded-lg border border-stone-200 p-4">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Step 2: Authenticate
                  </h3>
                  <CopyableCommand command="publish auth login" />
                  <p className="mt-2 text-xs text-stone-500">
                    This will open your browser to authorize the CLI.
                  </p>
                </div>

                <div className="rounded-lg border border-stone-200 p-4">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Step 3: Publish your content
                  </h3>
                  <CopyableCommand
                    command={`publish sync ./my-content --name ${siteName}`}
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    To update later, run{' '}
                    <code className="rounded bg-stone-100 px-1 py-0.5">
                      publish sync ./my-content --name ${siteName}
                    </code>
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
                Your initial publish is complete. Run the same command anytime
                you want to update your site with new content.
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
                className="flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition-all hover:bg-stone-50"
              >
                View site
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white transition-all hover:bg-white hover:text-black"
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
