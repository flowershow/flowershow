'use client';

import { X } from 'lucide-react';
import { env } from '@/env.mjs';

export type ClaimTrigger =
  | 'save_click'
  | 'url_copy'
  | 'second_publish'
  | 'revisit';

interface ClaimPromptProps {
  siteId: string;
  ownershipToken: string;
  trigger: ClaimTrigger;
  onDismiss: () => void;
}

const isSecure =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const protocol = isSecure ? 'https' : 'http';

/**
 * ClaimPrompt - Soft prompt to encourage claiming an anonymous site
 *
 * Design principles:
 * - Claiming is framed as **saving**, not upgrading
 * - No interruption before the user sees a live URL
 * - No mention of payment, features, or urgent countdown
 * - Always optional with clear "Not now" option
 */
export function ClaimPrompt({
  siteId,
  ownershipToken,
  trigger,
  onDismiss,
}: ClaimPromptProps) {
  const handleClaim = () => {
    // Track analytics
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('claim_started', {
        site_id: siteId,
        trigger: trigger,
      });
    }

    // Store token and siteId for post-auth claiming
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('claim_site_id', siteId);
      sessionStorage.setItem('claim_ownership_token', ownershipToken);
    }

    // Redirect to authentication with callback to claim page
    const callbackUrl = `${protocol}://${env.NEXT_PUBLIC_HOME_DOMAIN}/claim?siteId=${siteId}`;
    window.location.href = `${protocol}://${
      env.NEXT_PUBLIC_CLOUD_DOMAIN
    }/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  // Track that prompt was shown
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('claim_prompt_shown', {
      site_id: siteId,
      trigger: trigger,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Want to keep this site?
        </h2>

        <p className="text-gray-600 mb-6">
          Create an account to save it, manage multiple sites, and keep it live.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleClaim}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save & create account
          </button>

          <button
            onClick={onDismiss}
            className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
