'use client';

import { useRouter } from 'next/navigation';

export type ClaimTrigger = 'save_click' | 'url_copy';

interface ClaimPromptProps {
  siteId: string;
  trigger: ClaimTrigger;
  onDismiss: () => void;
}

/**
 * ClaimPrompt - Encourage users to claim their anonymous site
 *
 * Note: No need to pass ownershipToken anymore since it's stored in localStorage
 * via the persistent anonymousUserId system
 */
export function ClaimPrompt({ siteId, trigger, onDismiss }: ClaimPromptProps) {
  const router = useRouter();

  const handleClaim = () => {
    console.log('handleClaim called, siteId:', siteId);
    // Redirect to claim page which will:
    // 1. Authenticate user
    // 2. Get token from localStorage
    // 3. Call /api/claim
    router.push(`/claim?siteId=${siteId}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Want to keep this site?
        </h2>

        {/* Body - single sentence */}
        <p className="text-gray-600 mb-8 text-center">
          Create an account to save it, manage multiple sites, and keep it live.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleClaim}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Save & create account
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('onDismiss called');
              onDismiss();
            }}
            className="w-full px-6 py-3 text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
