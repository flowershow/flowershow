'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/providers/modal';
import { api } from '@/trpc/react';

type ExpirationOption = 'never' | '30d' | '90d' | '1y';

const EXPIRATION_OPTIONS: { value: ExpirationOption; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
];

function getExpirationDate(option: ExpirationOption): string | null {
  if (option === 'never') return null;

  const now = new Date();
  switch (option) {
    case '30d':
      now.setDate(now.getDate() + 30);
      break;
    case '90d':
      now.setDate(now.getDate() + 90);
      break;
    case '1y':
      now.setFullYear(now.getFullYear() + 1);
      break;
  }
  return now.toISOString();
}

export default function CreateTokenModal() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [expiration, setExpiration] = useState<ExpirationOption>('never');
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { mutate: createToken, isPending: isCreating } =
    api.user.createAccessToken.useMutation({
      onSuccess: (data) => {
        setCreatedToken(data.token);
        router.refresh();
      },
      onError: (err) => {
        setError(err.message ?? 'Failed to create token');
      },
    });

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setError(null);

    createToken({
      name: name.trim(),
      expiresAt: getExpirationDate(expiration),
    });
  };

  const handleCopy = async () => {
    if (!createdToken) return;

    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = createdToken;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    // Reset state after modal closes
    setTimeout(() => {
      setName('');
      setExpiration('never');
      setError(null);
      setCreatedToken(null);
      setCopied(false);
    }, 200);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
      >
        Create Token
      </button>

      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        closeOnClickOutside={!createdToken}
      >
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-stone-900">
          {createdToken ? (
            // Token created - show token
            <div>
              <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-white">
                Token Created
              </h2>

              <div className="mb-4 rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Copy this token now. You won&apos;t be able to see it again.
                </p>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Your token
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md bg-stone-100 px-3 py-2 text-sm dark:bg-stone-800">
                    {createdToken}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-md bg-stone-200 px-3 py-2 text-sm font-medium hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                Done
              </button>
            </div>
          ) : (
            // Create token form
            <div>
              <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-white">
                Create Personal Access Token
              </h2>

              <div className="mb-4">
                <label
                  htmlFor="token-name"
                  className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Name
                </label>
                <input
                  id="token-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Obsidian Plugin"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 dark:border-stone-600 dark:bg-stone-800 dark:text-white"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="token-expiration"
                  className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Expiration
                </label>
                <select
                  id="token-expiration"
                  value={expiration}
                  onChange={(e) =>
                    setExpiration(e.target.value as ExpirationOption)
                  }
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 dark:border-stone-600 dark:bg-stone-800 dark:text-white"
                >
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                >
                  {isCreating ? 'Creating...' : 'Create Token'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
