'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { env } from '@/env.mjs';
import { getAnonymousToken } from '@/lib/client-anonymous-user';
import { decideClaimAction, scrubbedClaimPath } from './claim-flow';
import { buildClaimCallbackUrl, buildClaimLoginUrl } from './claim-url';

const isSecure =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const protocol = isSecure ? 'https' : 'http';

type ClaimState = 'loading' | 'confirm' | 'claiming' | 'success' | 'error';

export default function ClaimPage() {
  const [state, setState] = useState<ClaimState>('loading');
  const [error, setError] = useState<string>('');
  const [claimedSite, setClaimedSite] = useState<{
    id: string;
    projectName: string;
  } | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();

  // Read once: the token is scrubbed from the address bar after login, but
  // kept here so the confirm button still works.
  const [siteId] = useState(() => searchParams.get('siteId'));
  const [linkToken] = useState(() => searchParams.get('token'));
  const claimStarted = useRef(false);

  const claimSite = useCallback(
    async (body: Record<string, string>) => {
      if (claimStarted.current) return;
      claimStarted.current = true;
      try {
        setState('claiming');
        const response = await fetch('/api/sites/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.error || 'Failed to claim site');
          setState('error');
          return;
        }

        // Success! Token remains in localStorage for claiming other sites
        setClaimedSite(result.site);
        setState('success');
        router.push(
          `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}/site/${result.site.id}/settings`,
        );
      } catch (err) {
        console.error('Claim error:', err);
        setError('An unexpected error occurred');
        setState('error');
      }
    },
    [router],
  );

  useEffect(() => {
    const ownershipToken = linkToken ? null : getAnonymousToken();
    const action = decideClaimAction({
      status,
      siteId,
      linkToken,
      hasOwnershipToken: !!ownershipToken,
    });

    switch (action) {
      case 'wait':
        return;
      case 'login': {
        // Redirect to login on cloud domain with callback back to home
        // domain, keeping the token so the claim can continue after login.
        const callbackUrl = buildClaimCallbackUrl({
          protocol,
          homeDomain: env.NEXT_PUBLIC_HOME_DOMAIN,
          siteId,
          token: linkToken,
        });
        router.push(
          buildClaimLoginUrl({
            protocol,
            cloudDomain: env.NEXT_PUBLIC_CLOUD_DOMAIN,
            callbackUrl,
          }),
        );
        return;
      }
      case 'confirm':
        // Logged in: drop the secret token from the address bar and history.
        window.history.replaceState(
          window.history.state,
          '',
          scrubbedClaimPath(window.location.pathname, siteId),
        );
        setState((s) => (s === 'loading' ? 'confirm' : s));
        return;
      case 'auto-claim':
        if (siteId && ownershipToken) claimSite({ siteId, ownershipToken });
        return;
      case 'missing':
        setError('Missing claim information. Please try publishing again.');
        setState('error');
        return;
    }
  }, [status, siteId, linkToken, router, claimSite]);

  const dashboardUrl = `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`;

  if (state === 'confirm' && siteId && linkToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-md w-full text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
            Add this site to your account?
          </h1>
          <p className="text-gray-600 dark:text-zinc-300 mb-2">
            Site ID: <code className="break-all">{siteId}</code>
          </p>
          <p className="text-gray-600 dark:text-zinc-300 mb-6">
            This site was published without an account. It will expire unless
            you add it to your account.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => claimSite({ siteId, claimToken: linkToken })}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Add to my account
            </button>
            <a
              href={dashboardUrl}
              className="text-sm text-gray-600 dark:text-zinc-300 underline"
            >
              Cancel
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'loading' || state === 'claiming') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-md w-full text-center px-4">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-zinc-700 border-t-orange-500"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Claiming your site...
          </h1>
          <p className="text-gray-600 dark:text-zinc-300">
            This will just take a moment
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-md w-full text-center px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Claim Failed
          </h1>
          <p className="text-gray-600 dark:text-zinc-300 mb-6">{error}</p>
          <button
            onClick={() => router.push(dashboardUrl)}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (state === 'success' && claimedSite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-md w-full text-center px-4">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Site Claimed Successfully!
          </h1>
          <p className="text-gray-600 dark:text-zinc-300 mb-6">
            Your site <strong>{claimedSite.projectName}</strong> is now saved to
            your account.
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return null;
}
