'use client';

import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GithubIcon } from '@/components/icons';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

interface RepoAccessLostFormProps {
  siteId: string;
  repositoryName: string;
  hasInstallation: boolean;
}

export default function RepoAccessLostForm({
  siteId,
  repositoryName,
  hasInstallation,
}: RepoAccessLostFormProps) {
  const router = useRouter();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const reconnectSite = api.site.reconnectSiteToGitHubApp.useMutation({
    onSuccess: () => {
      toast.success('Repository access restored!');
      router.refresh();
    },
    onError: (error) => {
      console.error('Reconnect failed:', error);
      posthog.captureException(error);
      toast.error(error.message || 'Failed to restore repository access');
      setIsReconnecting(false);
    },
  });

  const getInstallationUrl = api.github.getInstallationUrl.useMutation();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const expectedOrigin = window.location.origin;
      if (event.origin !== expectedOrigin) return;
      if (event.data?.type === 'github-app-installed') {
        setIsConnecting(false);
        toast.success('GitHub App connected! Refreshing page...');
        router.refresh();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    posthog.capture('reconnect_site_to_github_app_clicked', {
      site_id: siteId,
      repository: repositoryName,
    });
    await reconnectSite.mutateAsync({ siteId });
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    posthog.capture('grant_github_app_access_clicked', { site_id: siteId });
    try {
      const result = await getInstallationUrl.mutateAsync({});
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
      }
    } catch (error) {
      console.error('Failed to get installation URL:', error);
      posthog.captureException(error);
      toast.error('Failed to open GitHub App');
      setIsConnecting(false);
    }
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
            Repository access lost
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            This site was connected to{' '}
            <code className="font-mono text-xs bg-blue-200 px-1.5 py-0.5 rounded text-blue-900">
              {repositoryName}
            </code>{' '}
            but the GitHub App no longer has access. Auto-sync has been
            disabled.
          </p>

          {!hasInstallation ? (
            <div className="mb-4 rounded-md bg-blue-100 p-3 space-y-2">
              <p className="text-sm font-semibold text-blue-900">
                Step 1 of 2: Grant repository access
              </p>
              <p className="text-sm text-blue-800">
                Open the GitHub App settings and grant access to:
                <code className="font-mono ml-1 text-xs bg-blue-200 px-1.5 py-1 rounded text-blue-900">
                  {repositoryName}
                </code>
              </p>
            </div>
          ) : (
            <div className="mb-4 rounded-md bg-blue-100 p-3 space-y-2">
              <p className="text-sm font-semibold text-blue-900">
                Step 2 of 2: Restore connection
              </p>
              <p className="text-sm text-blue-800">
                The GitHub App now has access to this repository. Click
                &quot;Restore connection&quot; to re-enable sync.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {hasInstallation ? (
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className={cn(
                  'flex h-10 min-w-[13rem] items-center justify-center space-x-2 rounded-md border px-4 text-sm font-medium transition-all focus:outline-none',
                  isReconnecting
                    ? 'cursor-not-allowed border-blue-300 bg-blue-100 text-blue-400'
                    : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
                )}
              >
                {isReconnecting ? (
                  <LoadingDots color="#60a5fa" />
                ) : (
                  <span>Restore connection</span>
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
                <span>Grant repository access</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
