'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export type MemberActionResult = { error?: string };

interface Member {
  userId: string;
  username: string;
  name: string | null;
  email?: string | null;
  createdAt: Date | string;
}

interface Invite {
  id: string;
  email: string;
  expiresAt: Date | string;
  createdAt: Date | string;
}

interface MembersPanelProps {
  role: 'owner' | 'editor';
  owner: { username: string };
  members: Member[];
  invites: Invite[];
  isPremium: boolean;
  actions: {
    invite: (email: string) => Promise<MemberActionResult>;
    revokeInvite: (inviteId: string) => Promise<MemberActionResult>;
    remove: (userId: string) => Promise<MemberActionResult>;
    leave: () => Promise<MemberActionResult>;
  };
}

const buttonClass =
  'rounded-md border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-900';

const listClass =
  'divide-y divide-stone-100 rounded-md border border-stone-200 bg-white dark:divide-zinc-800 dark:border-zinc-700 dark:bg-zinc-950';

const mutedClass = 'text-xs text-stone-500 dark:text-zinc-400';

const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(d));

export default function MembersPanel({
  role,
  owner,
  members,
  invites,
  isPremium,
  actions,
}: MembersPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    key: string,
    action: () => Promise<MemberActionResult>,
    done: string,
    onDone?: () => void,
  ) => {
    setBusy(key);
    setError(null);
    const result = await action();
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(done);
    if (onDone) onDone();
    else router.refresh();
  };

  const isOwner = role === 'owner';
  const sorted = [...members].sort((a, b) =>
    a.username.localeCompare(b.username),
  );

  return (
    <div className="flex flex-col space-y-8">
      {isOwner && (
        <section className="flex flex-col space-y-2">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-zinc-100">
            Invite an editor
          </h3>
          {!isPremium && (
            <p className="text-sm text-stone-500 dark:text-zinc-400">
              Inviting editors needs Premium. You can still remove editors and
              revoke invites.
            </p>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                'invite',
                () => actions.invite(email),
                'Invite sent',
                () => {
                  setEmail('');
                  router.refresh();
                },
              );
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={!isPremium}
              className="w-72 rounded-md border border-stone-300 px-3 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
            <button
              type="submit"
              className={buttonClass}
              disabled={!isPremium || busy === 'invite'}
            >
              Invite
            </button>
          </form>
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <section className="flex flex-col space-y-2">
        <h3 className="text-sm font-semibold text-stone-800 dark:text-zinc-100">
          People with access
        </h3>
        <ul className={listClass}>
          <li className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{owner.username}</span>
            <span className={mutedClass}>Owner</span>
          </li>
          {sorted.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>
                {m.username}
                {m.name ? ` (${m.name})` : ''}
                {isOwner && m.email ? (
                  <span className={`ml-2 ${mutedClass}`}>{m.email}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-3">
                <span className={mutedClass}>Editor</span>
                {isOwner && (
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={busy === `remove:${m.userId}`}
                    onClick={() =>
                      run(
                        `remove:${m.userId}`,
                        () => actions.remove(m.userId),
                        'Editor removed',
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {isOwner && invites.length > 0 && (
        <section className="flex flex-col space-y-2">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-zinc-100">
            Pending invites
          </h3>
          <ul className={listClass}>
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>
                  {i.email}
                  <span className={`ml-2 ${mutedClass}`}>
                    expires {formatDate(i.expiresAt)}
                  </span>
                </span>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy === `revoke:${i.id}`}
                  onClick={() =>
                    run(
                      `revoke:${i.id}`,
                      () => actions.revokeInvite(i.id),
                      'Invite revoked',
                    )
                  }
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isOwner && (
        <div>
          <button
            type="button"
            className={buttonClass}
            disabled={busy === 'leave'}
            onClick={() => {
              if (!window.confirm('Leave this site? You will lose access.'))
                return;
              run('leave', actions.leave, 'You left the site', () => {
                window.location.assign('/');
              });
            }}
          >
            Leave site
          </button>
        </div>
      )}
    </div>
  );
}
