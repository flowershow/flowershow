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
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        signIn('email', { email, callbackUrl }).finally(() =>
          setPending(false),
        );
      }}
      className="rounded-md border border-black bg-black px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white hover:text-black disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      Sign in with {email}
    </button>
  );
}
