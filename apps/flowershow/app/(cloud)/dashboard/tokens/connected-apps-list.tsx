'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/trpc/react';

interface ConnectedApp {
  id: string;
  name: string;
  host: string;
  userHosted: boolean;
  scope: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

const formatDate = (date: Date | null) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

const TH =
  'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400';
const TD =
  'whitespace-nowrap px-6 py-4 text-sm text-stone-500 dark:text-stone-400';
const REVOKE =
  'text-sm text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300';

/** MCP OAuth grants (flowershow-3fr.4): apps such as Claude or ChatGPT. */
export default function ConnectedAppsList({ apps }: { apps: ConnectedApp[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const revoke = api.user.revokeConnectedApp.useMutation();

  const handleRevoke = async (app: ConnectedApp) => {
    if (
      !confirm(
        `Disconnect ${app.name}? It will lose access to your sites and need you to sign in again.`,
      )
    ) {
      return;
    }
    setRevokingId(app.id);
    try {
      await revoke.mutateAsync({ grantId: app.id });
      router.refresh();
    } catch {
      alert('Failed to disconnect the app. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  if (apps.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-6 text-center dark:border-stone-700 dark:bg-black">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          No connected apps. Connect Claude, ChatGPT or another AI app to
          publish from a chat:{' '}
          <a
            href="https://flowershow.app/docs/agents/mcp"
            className="underline hover:text-stone-900 dark:hover:text-stone-200"
          >
            see how
          </a>
          .
        </p>
      </div>
    );
  }

  const revokeButton = (app: ConnectedApp) => (
    <button
      type="button"
      onClick={() => handleRevoke(app)}
      disabled={revokingId === app.id}
      className={REVOKE}
      data-testid="connected-app-revoke"
    >
      {revokingId === app.id ? 'Revoking...' : 'Revoke'}
    </button>
  );

  const nameCell = (app: ConnectedApp) => (
    <span className="flex flex-col">
      <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
        {app.name}
      </span>
      <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
        {app.host}
        {app.userHosted && ' (user-published site)'}
      </span>
    </span>
  );

  return (
    <div
      className="rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-black"
      data-testid="connected-apps"
    >
      {/* Mobile: stacked cards */}
      <ul className="divide-y divide-stone-200 dark:divide-stone-700 md:hidden">
        {apps.map((app) => (
          <li key={app.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              {nameCell(app)}
              {revokeButton(app)}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {(
                [
                  ['Access', app.scope],
                  ['Connected', formatDate(app.createdAt)],
                  ['Last Used', formatDate(app.lastUsedAt)],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-stone-600 dark:text-stone-300">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700">
              <th className={TH}>App</th>
              <th className={TH}>Access</th>
              <th className={TH}>Connected</th>
              <th className={TH}>Last Used</th>
              <th className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
            {apps.map((app) => (
              <tr key={app.id} data-testid="connected-app-row">
                <td className="px-6 py-4">{nameCell(app)}</td>
                <td className={`${TD} font-mono`}>{app.scope}</td>
                <td className={TD}>{formatDate(app.createdAt)}</td>
                <td className={TD}>{formatDate(app.lastUsedAt)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  {revokeButton(app)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
