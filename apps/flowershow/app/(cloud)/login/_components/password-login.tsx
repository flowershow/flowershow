'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';

const INPUT_CLASS =
  'h-10 w-full rounded-md border border-stone-200 px-3 text-sm text-stone-700 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-50 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:disabled:bg-zinc-950';

/**
 * Password sign-in for the app-review account (lib/review-login.ts). Rendered
 * only while that login is switched on; it works for that one account only.
 */
export default function PasswordLogin({
  providerId,
  callbackUrl,
  disabled,
}: {
  providerId: string;
  callbackUrl: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full text-center text-xs text-stone-500 underline hover:text-primary-subtle dark:text-zinc-400"
      >
        Sign in with password
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn(providerId, {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.ok && !res.error) {
        // Full navigation so the new session cookie is used everywhere.
        window.location.assign(res.url ?? callbackUrl);
        return;
      }
      toast.error('Wrong email or password.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const busy = disabled || loading;
  const canSubmit = !busy && email.trim() !== '' && password !== '';

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      aria-label="Sign in with password"
    >
      <input
        type="email"
        name="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        placeholder="Email"
        className={INPUT_CLASS}
      />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy}
        placeholder="Password"
        className={INPUT_CLASS}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className={`${
          canSubmit
            ? 'bg-black hover:bg-stone-800 active:bg-stone-700'
            : 'cursor-not-allowed bg-stone-200 dark:bg-zinc-700'
        } flex h-10 w-full items-center justify-center rounded-md border border-transparent transition-colors duration-75 focus:outline-none`}
      >
        {loading ? (
          <LoadingDots color="#A8A29E" />
        ) : (
          <p
            className={`text-sm font-medium ${
              canSubmit ? 'text-white' : 'text-stone-400 dark:text-zinc-500'
            }`}
          >
            Sign in
          </p>
        )}
      </button>
    </form>
  );
}
