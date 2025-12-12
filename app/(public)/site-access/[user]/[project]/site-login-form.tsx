'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PasswordInput } from '@/components/dashboard/password-input';

interface Props {
  siteId: string;
}

export function SiteLoginForm({ siteId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/site/login', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid password');
      }

      const returnTo = searchParams.get('returnTo');

      if (returnTo) {
        router.replace(returnTo);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="siteid" value={siteId} />
      <PasswordInput
        id="password"
        name="password"
        label="Visitor password"
        required
        autoComplete="current-password"
        className="w-full rounded border px-3 py-2"
        error={error}
        disabled={isSubmitting}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="group my-2 flex h-10 w-full items-center justify-center space-x-2 rounded-md border border-stone-200 bg-white transition-colors duration-75 hover:bg-stone-50 focus:outline-none active:bg-stone-100 disabled:opacity-50"
      >
        <span className="text-sm font-medium text-stone-600">
          {isSubmitting ? 'Logging in...' : 'Login'}
        </span>
      </button>
    </form>
  );
}
