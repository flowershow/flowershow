'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { GithubIcon } from '@/components/icons';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import * as Sentry from '@sentry/nextjs';

interface MigrationBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export default function MigrationBanner({
  onDismiss,
  className,
}: MigrationBannerProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleMigrate = async () => {
    setIsMigrating(true);

    Sentry.startSpan(
      {
        op: 'ui.click',
        name: 'GitHub App Migration Initiated',
      },
      async (span) => {
        try {
          const response = await fetch('/api/github-app/installation-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          if (!response.ok) {
            throw new Error('Failed to generate installation URL');
          }

          const data = await response.json();
          span.setAttribute('migration_initiated', true);

          // Redirect to GitHub App installation page
          window.location.href = data.url;
        } catch (error) {
          console.error('Failed to initiate migration:', error);
          Sentry.captureException(error);
          toast.error('Failed to start migration. Please try again.');
          setIsMigrating(false);
        }
      },
    );
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
    // Store dismissal in localStorage
    localStorage.setItem('github-app-migration-banner-dismissed', 'true');
  };

  // Check if banner was previously dismissed
  if (isDismissed) {
    return null;
  }

  if (typeof window !== 'undefined') {
    const dismissed = localStorage.getItem(
      'github-app-migration-banner-dismissed',
    );
    if (dismissed === 'true') {
      return null;
    }
  }

  return (
    <div
      className={cn(
        'rounded-md border border-blue-200 bg-blue-50 p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <GithubIcon className="h-5 w-5 text-blue-700" />
            <h3 className="text-sm font-semibold text-blue-900">
              Upgrade to Secure Repository Access
            </h3>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            Switch to GitHub App for enhanced security. Grant Flowershow access
            only to the repositories you choose, instead of all your
            repositories.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className={cn(
                'flex h-9 items-center justify-center space-x-2 rounded-md border px-4 text-sm transition-all focus:outline-none',
                isMigrating
                  ? 'cursor-not-allowed border-blue-300 bg-blue-100 text-blue-400'
                  : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
              )}
            >
              {isMigrating ? (
                <LoadingDots color="#60a5fa" />
              ) : (
                <span>Upgrade to GitHub App</span>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="h-9 rounded-md px-4 text-sm text-blue-700 hover:text-blue-900 hover:underline focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 text-blue-400 hover:text-blue-600 focus:outline-none"
          aria-label="Dismiss banner"
        >
          <svg
            className="h-5 w-5"
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
      </div>
    </div>
  );
}
