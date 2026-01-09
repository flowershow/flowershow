'use client';

import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GithubIcon } from '@/components/icons';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

interface MigrateToGitHubAppFormProps {
  siteId: string;
  repositoryName: string;
  hasInstallation: boolean;
}

export default function MigrateToGitHubAppForm({
  siteId,
  repositoryName,
  hasInstallation,
}: MigrateToGitHubAppFormProps) {
  const router = useRouter();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const migrateSite = api.site.migrateSiteToGitHubApp.useMutation({
    onSuccess: () => {
      toast.success('Successfully migrated to GitHub App!');
      router.refresh();
    },
    onError: (error) => {
      console.error('Migration failed:', error);
      Sentry.captureException(error);
      toast.error(error.message || 'Failed to migrate site');
      setIsMigrating(false);
    },
  });

  const getInstallationUrl = api.github.getInstallationUrl.useMutation();

  // Listen for postMessage from popup window after GitHub App installation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message origin for security
      const expectedOrigin = window.location.origin;
      if (event.origin !== expectedOrigin) {
        console.warn('Received message from unexpected origin:', event.origin);
        return;
      }

      // Verify the message is from our callback
      if (event.data?.type === 'github-app-installed') {
        console.log('GitHub App installation completed, refreshing page');
        setIsConnecting(false);
        toast.success('GitHub App connected! Refreshing page...');
        // Refresh the page to update installation status
        router.refresh();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [router]);

  const handleMigrate = async () => {
    setIsMigrating(true);

    Sentry.startSpan(
      {
        op: 'ui.click',
        name: 'Migrate Site to GitHub App',
      },
      async (span) => {
        span.setAttribute('site_id', siteId);
        span.setAttribute('repository', repositoryName);

        await migrateSite.mutateAsync({ siteId });
      },
    );
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    Sentry.startSpan(
      {
        op: 'ui.click',
        name: 'Connect GitHub App Before Migration',
      },
      async (span) => {
        span.setAttribute('site_id', siteId);

        try {
          const result = await getInstallationUrl.mutateAsync({});

          // Open GitHub App installation in popup window
          const width = 800;
          const height = 800;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;

          const popup = window.open(
            result.url,
            'github-app-install',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`,
          );

          if (!popup) {
            toast.error('Please allow popups for this site');
            setIsConnecting(false);
            return;
          }
        } catch (error) {
          console.error('Failed to get installation URL:', error);
          Sentry.captureException(error);
          toast.error('Failed to connect GitHub App');
          setIsConnecting(false);
        }
      },
    );
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <GithubIcon className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-blue-900 mb-2">
            Upgrade to GitHub App
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            This site uses legacy OAuth authentication. Upgrade to GitHub App
            for enhanced security with granular repository access control.
          </p>

          {!hasInstallation ? (
            <div className="mb-4 rounded-md bg-blue-100 p-3 space-y-2">
              <p className="text-sm font-semibold text-blue-900">
                Step 1 of 2: Install GitHub App
              </p>
              <p className="text-sm text-blue-800">
                Install the Flowershow GitHub App and grant it access to:
                <code className="font-mono ml-1 text-xs bg-blue-200 px-1.5 py-1 rounded text-blue-900">
                  {repositoryName}
                </code>
              </p>
            </div>
          ) : (
            <div className="mb-4 rounded-md bg-blue-100 p-3 space-y-2">
              <p className="text-sm font-semibold text-blue-900">
                Step 2 of 2: Link This Site
              </p>
              <p className="text-sm text-blue-800">
                Click &quot;Migrate to GitHub App&quot; below to link this
                specific site to your installation. This switches the
                site&apos;s authentication and removes the legacy webhook.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {hasInstallation ? (
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className={cn(
                  'flex h-10 min-w-[13rem] items-center justify-center space-x-2 rounded-md border px-4 text-sm font-medium transition-all focus:outline-none',
                  isMigrating
                    ? 'cursor-not-allowed border-blue-300 bg-blue-100 text-blue-400'
                    : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
                )}
              >
                {isMigrating ? (
                  <LoadingDots color="#60a5fa" />
                ) : (
                  <span>Migrate to GitHub App</span>
                )}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className={cn(
                  'flex h-10 min-w-[13rem] items-center justify-center space-x-2 rounded-md border px-4 text-sm font-medium transition-all focus:outline-none',
                  isConnecting
                    ? 'cursor-not-allowed border-blue-300 bg-blue-100 text-blue-400'
                    : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
                )}
              >
                <GithubIcon className="h-4 w-4" />
                <span>Connect GitHub App</span>
              </button>
            )}
            {/* <a
              href="https://flowershow.app/docs/github-app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center justify-center rounded-md border border-blue-300 bg-white px-4 text-sm font-medium text-blue-700 transition-all hover:bg-blue-50 focus:outline-none"
            >
              Learn More
            </a> */}
          </div>
        </div>
      </div>
    </div>
  );
}
