'use client';

import { CheckCircleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Modal from '@/providers/modal';
import { api } from '@/trpc/react';

const calculateSHA256 = async (content: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  if (typeof crypto.subtle?.digest === 'function') {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i] ?? 0;
    hash = (hash * 0x01000193) >>> 0;
  }
  return (
    hash.toString(16).padStart(8, '0') +
    data.length.toString(16).padStart(16, '0')
  );
};

type State = 'idle' | 'publishing' | 'processing' | 'success' | 'error';

interface PasteMarkdownModalProps {
  siteId: string;
  siteUrl: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function PasteMarkdownModal({
  siteId,
  siteUrl,
  showModal,
  setShowModal,
}: PasteMarkdownModalProps) {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState('');

  const { data: publishState } = api.site.getLatestPublishState.useQuery(
    { id: siteId },
    { enabled: state === 'processing', refetchInterval: 3000 },
  );

  useEffect(() => {
    if (state === 'processing' && publishState && !publishState.isInProgress) {
      setState('success');
    }
  }, [publishState, state]);

  const handlePublish = async () => {
    if (!markdown.trim()) {
      setError('Please paste some markdown content');
      return;
    }

    setState('publishing');
    setError(null);

    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(markdown);
      const sha = await calculateSHA256(markdown);

      const res = await fetch(`/api/sites/id/${siteId}/files`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          files: [{ path: 'README.md', size: bytes.length, sha }],
        }),
      });
      if (!res.ok) throw new Error('Failed to get upload URLs');
      const { files: uploadTargets, publishId } = await res.json();

      await Promise.all(
        uploadTargets.map(
          async (target: { path: string; uploadUrl: string }) => {
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const uploadResponse = await fetch(target.uploadUrl, {
              method: 'PUT',
              body: blob,
              headers: { 'x-amz-meta-publish-id': publishId },
            });
            if (!uploadResponse.ok) throw new Error('Failed to upload content');
          },
        ),
      );

      setState('processing');
    } catch (err) {
      console.error('Publish error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to publish content',
      );
      setState('error');
    }
  };

  const handleClose = () => {
    if (state === 'publishing' || state === 'processing') return;
    if (state === 'success') {
      router.push(`/site/${siteId}/settings`);
      router.refresh();
    }
    setShowModal(false);
    setTimeout(() => {
      setState('idle');
      setMarkdown('');
      setError(null);
    }, 200);
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={handleClose}
      closeOnClickOutside={state !== 'publishing' && state !== 'processing'}
    >
      <div className="w-full md:max-w-lg overflow-hidden rounded-md bg-white md:border md:border-stone-200 md:shadow">
        <div className="relative flex flex-col space-y-2 p-5 md:p-10 md:pb-0">
          <div className="flex items-center gap-3">
            <h2 className="font-dashboard-heading text-2xl">Paste Markdown</h2>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Experimental
            </span>
          </div>
          <p className="text-left text-sm text-stone-500">
            Paste your markdown content and publish it as a page on your site.
          </p>
        </div>

        <div className="space-y-4 p-5 md:px-10 md:py-6">
          {(state === 'idle' || state === 'error') && (
            <div>
              <label
                htmlFor="paste-markdown-textarea"
                className="mb-1 block text-left text-xs font-medium text-stone-700"
              >
                Markdown content
              </label>
              <textarea
                id="paste-markdown-textarea"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder={'# My Page\n\nPaste your markdown here...'}
                rows={12}
                className="w-full resize-none rounded-md border border-stone-200 px-3 py-2 font-mono text-sm text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:outline-none"
              />
            </div>
          )}

          {(state === 'publishing' || state === 'processing') && (
            <div className="py-8 text-center">
              <svg
                aria-label={
                  state === 'publishing' ? 'Publishing...' : 'Processing...'
                }
                className="mx-auto h-10 w-10 animate-spin text-stone-600"
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
              <p className="mt-3 text-sm text-stone-600">
                {state === 'publishing' ? 'Publishing...' : 'Processing...'}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="py-8 text-center">
              <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500" />
              <p className="mt-3 text-sm font-medium text-stone-900">
                Published successfully!
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Your page is ready to go.
              </p>
            </div>
          )}

          {error && <p className="text-center text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 md:px-10">
          {(state === 'idle' || state === 'error') && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!markdown.trim()}
                className="flex h-10 items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
              >
                Publish
              </button>
            </>
          )}

          {(state === 'publishing' || state === 'processing') && (
            <button
              type="button"
              disabled
              className="cursor-not-allowed px-4 py-2 text-sm font-medium text-stone-400"
            >
              Publishing...
            </button>
          )}

          {state === 'success' && (
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
          )}
        </div>
      </div>
    </Modal>
  );
}
