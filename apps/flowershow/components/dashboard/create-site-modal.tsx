'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Modal from '@/providers/modal';
import { api } from '@/trpc/react';

type State = 'idle' | 'creating' | 'error';

interface CreateSiteModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function CreateSiteModal({
  showModal,
  setShowModal,
}: CreateSiteModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const inputElement = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal && inputElement.current) {
      inputElement.current.focus();
    }
  }, [showModal]);

  const createSite = api.site.create.useMutation({
    onSuccess: (site) => {
      setShowModal(false);
      router.push(`/site/${site.id}/welcome`);
      router.refresh();
    },
    onError: (err) => {
      setError(err.message || 'Failed to create site');
      setState('error');
    },
  });

  const handleCreate = () => {
    setState('creating');
    setError(null);
    if (!name.trim()) {
      setError('Please enter a site name');
      setState('error');
      return;
    }
    createSite.mutate({ projectName: name.trim() });
  };

  const handleClose = () => {
    if (state === 'creating') return;
    setShowModal(false);
    setTimeout(() => {
      setName('');
      setState('idle');
      setError(null);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state !== 'creating') {
      handleCreate();
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={handleClose}
      closeOnClickOutside={state !== 'creating'}
    >
      <div className="w-full md:max-w-md bg-white dark:bg-zinc-950 rounded-md md:border md:border-stone-200 dark:md:border-zinc-700 md:shadow overflow-hidden">
        <div className="p-5 md:p-8">
          <h2 className="font-dashboard-heading text-2xl">Create a new site</h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-zinc-400">
            Choose a recognizable name for your site. You can always change it
            later.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="my-awesome-site"
            maxLength={32}
            ref={inputElement}
            required
            className="mt-4 w-full rounded-md border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-4 py-2 text-sm placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:border-black focus:outline-none focus:ring-black"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 p-3 md:px-8 gap-3">
          <button
            onClick={handleClose}
            disabled={state === 'creating'}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={state === 'creating'}
            className="flex h-10 items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white transition-all hover:bg-white hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:border-stone-200 dark:disabled:border-zinc-700 disabled:bg-stone-100 dark:disabled:bg-zinc-800 disabled:text-stone-400 dark:disabled:text-zinc-500"
          >
            {state === 'creating' ? 'Creating...' : 'Create site'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
