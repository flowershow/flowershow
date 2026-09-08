'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import clsx from 'clsx';
import { api } from '@/trpc/react';

export default function ChangeUsernameForm({
  currentUsername,
}: {
  currentUsername: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [newUsername, setNewUsername] = useState('');

  const { isPending: isChangingUsername, mutate: changeUsername } =
    api.user.changeUsername.useMutation({
      onSuccess: async () => {
        toast.success('Username successfully changed');
        // Update the session to reflect the new username
        await update({ username: newUsername });
        setNewUsername('');
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername === currentUsername) {
      toast.error('New username must be different from current username');
      return;
    }
    changeUsername({ newUsername });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-stone-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 id="changeUsername" className="font-dashboard-heading text-xl">
          Change Username
        </h2>
        <p className="text-sm text-stone-500 dark:text-zinc-400">
          Current username: <b>{currentUsername}</b>
        </p>
        <p className="text-sm text-stone-500 dark:text-zinc-400">
          Username may only contain alphanumeric characters or single hyphens,
          and cannot begin or end with a hyphen.
        </p>
        <input
          data-testid="change-username-input"
          name="newUsername"
          type="text"
          required
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="Enter new username"
          minLength={3}
          maxLength={39}
          pattern="^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$"
          className="w-full max-w-md rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
        />
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 dark:border-zinc-700 dark:bg-zinc-950 sm:flex-row sm:justify-end sm:space-x-4 sm:space-y-0 sm:px-10">
        <div className="min-w-32">
          <FormButton pending={isChangingUsername} />
        </div>
      </div>
    </form>
  );
}

function FormButton({ pending = false }) {
  return (
    <button
      className={clsx(
        'flex h-8 min-w-32 items-center justify-center px-4 rounded-md border text-sm transition-all focus:outline-none sm:h-10',
        pending
          ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'
          : 'border-stone-800 bg-stone-800 text-white hover:bg-white hover:text-stone-800',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Update Username</p>}
    </button>
  );
}
