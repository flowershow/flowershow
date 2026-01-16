'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { formatUserCode } from '@/lib/cli-auth';

export default function CliAuthorizePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [userCode, setUserCode] = useState('');
  const [error, setError] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      const code = searchParams.get('code');
      const callbackUrl = code
        ? `/cli/authorize?code=${encodeURIComponent(code)}`
        : '/cli/authorize';
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    // Get code from URL
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setUserCode(formatUserCode(codeParam));
    } else {
      setError('No verification code provided');
    }
  }, [searchParams, status, router]);

  const handleAuthorize = async () => {
    setError('');
    setIsAuthorizing(true);

    try {
      const response = await fetch('/api/cli/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_code: userCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error_description || 'Authorization failed');
        setIsAuthorizing(false);
        return;
      }

      setIsAuthorized(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsAuthorizing(false);
    }
  };

  const handleCancel = () => {
    router.push('/cloud');
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Authorization Successful
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You can now return to your CLI and continue
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-md border border-gray-300 bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800/80 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              Go to Dashboard
            </button>

            <button
              type="button"
              onClick={() => router.push('/tokens')}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              Manage Tokens
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Authorize CLI Access
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Confirm authorization for device code
          </p>
        </div>

        <div className="mt-8 space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Device Code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-gray-900">
                {userCode}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Account</p>
              <p className="mt-1 text-sm text-gray-900">
                {session?.user?.email || session?.user?.name}
              </p>
            </div>

            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    This will grant the Flowershow CLI access to:
                  </p>
                  <ul className="mt-2 list-inside list-disc text-sm text-blue-700">
                    <li>View and manage your sites</li>
                    <li>Upload and publish content</li>
                    <li>Access site settings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isAuthorizing}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAuthorize}
              disabled={isAuthorizing || !userCode}
              className="flex-1 rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAuthorizing ? 'Authorizing...' : 'Authorize'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
