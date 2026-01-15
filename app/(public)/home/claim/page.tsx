'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type ClaimState = 'loading' | 'claiming' | 'success' | 'error';

export default function ClaimPage() {
  const [state, setState] = useState<ClaimState>('loading');
  const [error, setError] = useState<string>('');
  const [claimedSite, setClaimedSite] = useState<{
    id: string;
    projectName: string;
  } | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Wait for authentication to complete
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      // Redirect to sign in
      router.push('/api/auth/signin');
      return;
    }

    // User is authenticated, proceed with claiming
    const claimSite = async () => {
      try {
        setState('claiming');

        // Get stored claim data
        const storedSiteId = sessionStorage.getItem('claim_site_id');
        const storedToken = sessionStorage.getItem('claim_ownership_token');

        // Also check URL params as fallback
        const siteId = storedSiteId || searchParams.get('siteId');
        const ownershipToken = storedToken;

        if (!siteId || !ownershipToken) {
          setError('Missing claim information. Please try publishing again.');
          setState('error');
          return;
        }

        // Call claim API
        const response = await fetch('/api/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            siteId,
            ownershipToken,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.error || 'Failed to claim site');
          setState('error');
          return;
        }

        // Clear stored data
        sessionStorage.removeItem('claim_site_id');
        sessionStorage.removeItem('claim_ownership_token');

        // Success!
        setClaimedSite(result.site);
        setState('success');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (err) {
        console.error('Claim error:', err);
        setError('An unexpected error occurred');
        setState('error');
      }
    };

    claimSite();
  }, [status, searchParams, router]);

  if (state === 'loading' || state === 'claiming') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="max-w-md w-full text-center px-4">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {state === 'loading'
              ? 'Authenticating...'
              : 'Claiming your site...'}
          </h1>
          <p className="text-gray-600">This will just take a moment</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="max-w-md w-full text-center px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Claim Failed
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (state === 'success' && claimedSite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="max-w-md w-full text-center px-4">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Site Claimed Successfully!
          </h1>
          <p className="text-gray-600 mb-6">
            Your site <strong>{claimedSite.projectName}</strong> is now saved to
            your account.
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}
