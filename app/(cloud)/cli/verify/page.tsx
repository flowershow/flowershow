'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { formatUserCode, isValidUserCodeFormat } from '@/lib/cli-auth';

export default function CliVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [userCode, setUserCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Pre-fill code from URL if present
    const codeParam = searchParams.get('code');
    if (codeParam) {
      const formatted = formatUserCode(codeParam);
      setUserCode(formatted);

      // Auto-submit if user is already logged in
      if (status === 'authenticated') {
        handleSubmit(formatted);
      }
    }
  }, [searchParams, status]);

  const handleSubmit = async (code?: string) => {
    const codeToSubmit = code || userCode;
    setError('');
    setIsSubmitting(true);

    try {
      // Validate format
      if (!isValidUserCodeFormat(codeToSubmit)) {
        setError('Invalid code format. Please enter an 8-character code.');
        setIsSubmitting(false);
        return;
      }

      // If not logged in, redirect to login with callback
      if (status !== 'authenticated') {
        const callbackUrl = `/cli/verify?code=${encodeURIComponent(
          codeToSubmit,
        )}`;
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      // Redirect to authorization page
      router.push(`/cli/authorize?code=${encodeURIComponent(codeToSubmit)}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    const formatted = formatUserCode(value);
    setUserCode(formatted);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Device Verification
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the code displayed in your CLI
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <label htmlFor="user-code" className="sr-only">
              User Code
            </label>
            <input
              id="user-code"
              name="user-code"
              type="text"
              autoComplete="off"
              required
              value={userCode}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="XXXX-XXXX"
              maxLength={9}
              className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-mono tracking-wider text-gray-900 placeholder-gray-500 focus:z-10 focus:border-black focus:outline-none focus:ring-black sm:text-3xl"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !userCode}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Continue'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have a code?{' '}
              <Link
                href="/cloud"
                className="font-medium text-black hover:underline"
              >
                Go to dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
