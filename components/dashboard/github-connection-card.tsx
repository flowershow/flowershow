'use client';
import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';
import { toast } from 'sonner';
import { GithubIcon } from '@/components/icons';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

interface GitHubConnectionCardProps {
  onRefresh?: () => void;
}

export default function GitHubConnectionCard({
  onRefresh,
}: GitHubConnectionCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const getInstallationUrl = api.github.getInstallationUrl.useMutation();

  const handleConnect = async () => {
    setIsConnecting(true);

    Sentry.startSpan(
      {
        op: 'ui.click',
        name: 'GitHub App Connection Initiated',
      },
      async (span) => {
        try {
          const data = await getInstallationUrl.mutateAsync({});
          span.setAttribute('installation_url_generated', true);

          // Open GitHub App installation in popup window
          const width = 800;
          const height = 800;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;

          const popup = window.open(
            data.url,
            'github-app-install',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`,
          );

          if (!popup) {
            toast.error('Please allow popups for this site');
            setIsConnecting(false);
            return;
          }

          // Listen for messages from the popup
          const handleMessage = (event: MessageEvent) => {
            console.log('Handle popup message');
            // Verify the message origin for security
            const expectedOrigin = window.location.origin;
            if (event.origin !== expectedOrigin) {
              console.warn(
                'Received message from unexpected origin:',
                event.origin,
              );
              return;
            }

            // Verify the message is from our callback
            if (event.data?.type === 'github-app-installed') {
              console.log('GitHub App installation completed successfully');
              setIsConnecting(false);

              // Close the popup if it's still open
              if (popup && !popup.closed) {
                popup.close();
              }

              // Refresh installations
              if (onRefresh) {
                onRefresh();
              }

              // Clean up listener
              window.removeEventListener('message', handleMessage);
            }
          };

          window.addEventListener('message', handleMessage);

          // Check if popup was closed without completing installation
          const checkPopupClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkPopupClosed);
              setIsConnecting(false);
              window.removeEventListener('message', handleMessage);
            }
          }, 500);
        } catch (error) {
          console.error('Failed to connect GitHub App:', error);
          Sentry.captureException(error);
          toast.error('Failed to connect GitHub. Please try again.');
          setIsConnecting(false);
        }
      },
    );
  };

  return (
    <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <GithubIcon className="h-5 w-5 text-stone-700" />
          <h3 className="text-lg font-semibold text-stone-900">
            GitHub Repository Access
          </h3>
        </div>
        <p className="text-sm text-stone-600">
          Grant Flowershow access to specific repositories using GitHub App
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={cn(
            'flex h-10 w-full items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none',
            isConnecting
              ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
              : 'border-black bg-black text-white hover:bg-white hover:text-black',
          )}
        >
          {isConnecting ? (
            <LoadingDots color="#808080" />
          ) : (
            <>
              <GithubIcon className="h-4 w-4" />
              <span>Connect GitHub</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
