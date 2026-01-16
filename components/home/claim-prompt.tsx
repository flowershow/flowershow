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
    // Redirect to claim page which will:
    // 1. Authenticate user
    // 2. Get token from localStorage
    // 3. Call /api/claim
    router.push(`/claim?siteId=${siteId}`);
  };

  const getTriggerMessage = () => {
    if (trigger === 'url_copy') {
      return "You've copied your site URL multiple times! Want to keep this site permanently?";
    }
    return 'Create an account to save your site and manage it from your dashboard.';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">💾</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Save Your Site
          </h2>
          <p className="text-gray-600">{getTriggerMessage()}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            With an account you can:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Keep your site permanently</li>
            <li>✓ Update content anytime</li>
            <li>✓ Manage multiple sites</li>
            <li>✓ Custom domains (coming soon)</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleClaim}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Create Account & Save Site
          </button>
          <button
            onClick={onDismiss}
            className="w-full px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Maybe later
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Your site will remain live for 30 days without an account
        </p>
      </div>
    </div>
  );
}
