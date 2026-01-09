'use client';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GithubIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface MigrationBannerProps {
  sites: Array<{
    id: string;
    projectName: string;
    ghRepository: string;
  }>;
  onDismiss?: () => void;
  className?: string;
}

export default function MigrationBanner({
  sites,
  onDismiss,
  className,
}: MigrationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Check localStorage only after mount to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);
    const dismissed = localStorage.getItem(
      'github-app-migration-banner-dismissed',
    );
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
    // Store dismissal in localStorage
    localStorage.setItem('github-app-migration-banner-dismissed', 'true');
  };

  // Don't render until mounted to avoid hydration errors
  if (!isMounted || isDismissed) {
    return null;
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
              Upgrade {sites.length} Site{sites.length !== 1 ? 's' : ''} to
              Secure Repository Access
            </h3>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            The following sites use legacy OAuth. Upgrade them to GitHub App for
            enhanced security with granular repository access control.
          </p>

          {/* Scrollable site list */}
          <div className="mb-3 max-h-48 overflow-y-auto rounded-md bg-blue-100 p-3">
            <div className="space-y-2">
              {sites.map((site) => (
                <Link
                  key={site.id}
                  href={`/site/${site.id}/settings`}
                  className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm transition-colors hover:bg-blue-50 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-blue-900 truncate">
                      {site.projectName}
                    </div>
                    <div className="text-xs text-blue-700 truncate">
                      {site.ghRepository}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
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
