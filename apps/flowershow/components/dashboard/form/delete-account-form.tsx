'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import clsx from 'clsx';
import { api } from '@/trpc/react';

export default function DeleteAccountForm({ username }: { username: string }) {
  const [confirmValue, setConfirmValue] = useState('');
  const confirmationMatches = confirmValue === username;

  const { isPending: isDeletingAccount, mutate: deleteAccount } =
    api.user.deleteAccount.useMutation({
      onSuccess: () => {
        toast.success('Account successfully deleted');
        // Sign out and redirect to home
        signOut({ callbackUrl: '/' });
      },
      onError: (error) => {
        toast.error(error.message);
        if (error.data?.code === 'UNAUTHORIZED') {
          setTimeout(() => {
            signOut();
          }, 3000);
        }
      },
    });

  const handleDelete = () => {
    if (!confirmationMatches) return;
    deleteAccount({ confirm: confirmValue });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleDelete();
      }}
      className="rounded-lg border border-red-600 bg-white "
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 id="deleteAccount" className="font-dashboard-heading text-xl ">
          Delete Account
        </h2>
        <p className="text-sm text-stone-500 ">
          Permanently deletes your account and all associated data. Type in your
          username <b>{username}</b> to confirm.
        </p>

        <input
          data-testid="delete-account-input"
          name="confirm"
          type="text"
          autoComplete="off"
          value={confirmValue}
          onChange={(e) => setConfirmValue(e.target.value)}
          placeholder={username}
          aria-invalid={confirmValue.length > 0 && !confirmationMatches}
          className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500    "
        />
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3   sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
        <p className="w-full text-sm text-stone-500 ">
          This action is irreversible. Please proceed with caution.
        </p>
        <FormButton
          pending={isDeletingAccount}
          disabled={!confirmationMatches}
        />
      </div>
    </form>
  );
}

function FormButton({ pending = false, disabled = false }) {
  const inactive = pending || disabled;
  return (
    <button
      className={clsx(
        'flex h-8 min-w-32 text-nowrap items-center justify-center px-4 rounded-md border text-sm transition-all focus:outline-none sm:h-10',
        inactive
          ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400   '
          : 'border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600 ',
      )}
      disabled={inactive}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Confirm Delete</p>}
    </button>
  );
}
