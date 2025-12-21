'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Token {
  id: string;
  name: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}

export default function TokensList({ tokens }: { tokens: Token[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (tokenId: string) => {
    if (
      !confirm(
        'Are you sure you want to revoke this token? This action cannot be undone.',
      )
    ) {
      return;
    }

    setRevokingId(tokenId);

    try {
      const response = await fetch('/api/cli/tokens/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: tokenId }),
      });

      if (!response.ok) {
        throw new Error('Failed to revoke token');
      }

      router.refresh();
    } catch (error) {
      console.error('Error revoking token:', error);
      alert('Failed to revoke token. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (tokens.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8 text-center dark:border-stone-700 dark:bg-black">
        <p className="text-stone-500 dark:text-stone-400">
          No CLI tokens found. Authenticate with the CLI to create one.
        </p>
        <div className="mt-4">
          <code className="rounded bg-stone-100 px-2 py-1 text-sm dark:bg-stone-800">
            flowershow auth login
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-black">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Last Used
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Expires
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
            {tokens.map((token) => (
              <tr key={token.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-stone-900 dark:text-stone-100">
                  {token.name || 'CLI Token'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500 dark:text-stone-400">
                  {formatDate(token.createdAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500 dark:text-stone-400">
                  {formatDate(token.lastUsedAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500 dark:text-stone-400">
                  {token.expiresAt ? formatDate(token.expiresAt) : 'Never'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => handleRevoke(token.id)}
                    disabled={revokingId === token.id}
                    className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                  >
                    {revokingId === token.id ? 'Revoking...' : 'Revoke'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
