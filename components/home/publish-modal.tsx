'use client';

import { env } from '@/env.mjs';

const isSecure =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const protocol = isSecure ? 'https' : 'http';

interface PublishModalProps {
  state: 'uploading' | 'published' | 'error';
  liveUrl: string;
  error: string;
  copied: boolean;
  onCopyUrl: () => void;
  onSaveSite: () => void;
  onPublishAnother: () => void;
  onClose: () => void;
}

export function PublishModal({
  state,
  liveUrl,
  error,
  copied,
  onCopyUrl,
  onSaveSite,
  onPublishAnother,
  onClose,
}: PublishModalProps) {
  if (state === 'uploading') {
    return (
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          </div>
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Publishing your site...
          </p>
          <p className="text-sm text-gray-500">
            This usually takes 10-20 seconds
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Publishing Failed
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onPublishAnother}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Published state
  return (
    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        aria-label="Close"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Success header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="text-2xl font-bold text-gray-900">Your site is live!</h2>
      </div>

      {/* Live URL */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your live URL
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 px-3 py-2 rounded-lg text-sm break-all border border-gray-200">
            {`${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${liveUrl}`}
          </code>
          <button
            onClick={onCopyUrl}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap text-sm"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Expiry notice */}
      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          This site is temporary and will expire in 7 days.
        </p>
      </div>

      {/* Primary action */}
      <button
        onClick={onSaveSite}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-base mb-4"
      >
        Save this site
      </button>

      {/* Secondary actions */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <button
          onClick={onPublishAnother}
          className="text-gray-600 hover:text-gray-900 hover:underline"
        >
          Publish another
        </button>
        <a
          href={`${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${liveUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-900 hover:underline"
        >
          View site
        </a>
      </div>
    </div>
  );
}
