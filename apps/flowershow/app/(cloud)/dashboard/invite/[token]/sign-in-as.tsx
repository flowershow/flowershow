'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignInAs({
  email,
  callbackUrl,
}: {
  email: string;
  callbackUrl: string;
}) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const send = async () => {
    setPending(true);
    setStatus('idle');
    try {
      const res = await signIn('email', {
        email,
        callbackUrl,
        redirect: false,
      });
      setStatus(res?.error ? 'error' : 'sent');
    } catch {
      setStatus('error');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={send}
        className="rounded-md border border-black bg-black px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white hover:text-black disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Sign in with {email}
      </button>
      {status === 'sent' && (
        <p role="status" className="text-sm text-stone-600 dark:text-zinc-300">
          Check your inbox at {email} for a sign-in link.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          We couldn&apos;t send the sign-in link. Please try again.
        </p>
      )}
    </div>
  );
}
