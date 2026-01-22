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
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-500"></div>
          </div>
          <p className="text-lg text-gray-600 mb-2">Publishing your site...</p>
          <p className="text-sm text-gray-400">
            This usually takes 5-10 seconds
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-3xl mb-4 opacity-70">⚠️</div>
          <h2 className="text-lg font-medium text-gray-700 mb-2">
            Publishing Failed
          </h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={onPublishAnother}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Published state
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
      {/* Success header */}
      <div className="text-center mb-5">
        <h2 className="text-xl font-medium text-gray-700">
          Your site is live! 🎉
        </h2>
      </div>

      {/* Live URL */}
      <div className="mb-5">
        <label className="block text-xs text-gray-500 mb-1.5">Live URL</label>
        <code className="block bg-gray-50 px-3 py-2 rounded text-xs break-all text-gray-600 mb-2.5">
          {`${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${liveUrl}`}
        </code>
        <div className="flex gap-2">
          <button
            onClick={onCopyUrl}
            className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-sm"
          >
            {copied ? 'Copied' : 'Copy URL'}
          </button>
          <a
            href={`${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${liveUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-3 py-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors text-sm text-center"
          >
            Visit site
          </a>
        </div>
      </div>

      {/* Expiry notice + save action */}
      <div className="mb-2 p-3 bg-gray-50 rounded">
        <p className="text-xs text-gray-500 mb-2.5">
          This site will expire in 7 days unless you save it.
        </p>
        <button
          onClick={onSaveSite}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm"
        >
          Save to keep permanently
        </button>
      </div>

      {/* Secondary actions */}
      <div className="flex items-center justify-center">
        <button
          onClick={onPublishAnother}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Publish another
        </button>
      </div>
    </div>
  );
}
