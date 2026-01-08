'use client';
import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GithubIcon } from '@/components/icons';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';

interface Installation {
  id: string;
  accountLogin: string;
  accountType: 'User' | 'Organization';
  repositories: Array<{
    id: string;
    name: string;
    fullName: string;
    isPrivate: boolean;
  }>;
  createdAt: string;
}

export default function GitHubSettingsPage() {
  const router = useRouter();
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInstallations();
  }, []);

  const fetchInstallations = async () => {
    Sentry.startSpan(
      {
        op: 'http.client',
        name: 'Fetch GitHub Installations',
      },
      async () => {
        try {
          const response = await fetch('/api/github-app/installations');
          if (!response.ok) {
            throw new Error('Failed to fetch installations');
          }
          const data = await response.json();
          setInstallations(data.installations || []);
        } catch (error) {
          console.error('Error fetching installations:', error);
          Sentry.captureException(error);
          toast.error('Failed to load GitHub installations');
        } finally {
          setIsLoading(false);
        }
      },
    );
  };

  const handleSync = async (installationId: string) => {
    setSyncingIds((prev) => new Set(prev).add(installationId));

    Sentry.startSpan(
      {
        op: 'http.client',
        name: 'Sync GitHub Installation Repositories',
      },
      async (span) => {
        try {
          const response = await fetch('/api/github-app/sync-repositories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ installationId }),
          });

          if (!response.ok) {
            throw new Error('Failed to sync repositories');
          }

          const data = await response.json();
          span.setAttribute('repositories_synced', data.count);
          toast.success(
            `Synced ${data.count} repositor${data.count !== 1 ? 'ies' : 'y'}`,
          );
          await fetchInstallations();
        } catch (error) {
          console.error('Error syncing repositories:', error);
          Sentry.captureException(error);
          toast.error('Failed to sync repositories');
        } finally {
          setSyncingIds((prev) => {
            const next = new Set(prev);
            next.delete(installationId);
            return next;
          });
        }
      },
    );
  };

  const handleRemove = async (installationId: string, accountLogin: string) => {
    if (
      !confirm(
        `Remove installation for "${accountLogin}"? This will not uninstall the app from GitHub.`,
      )
    ) {
      return;
    }

    setRemovingIds((prev) => new Set(prev).add(installationId));

    Sentry.startSpan(
      {
        op: 'http.client',
        name: 'Remove GitHub Installation',
      },
      async (span) => {
        try {
          const response = await fetch(
            `/api/github-app/installations/${installationId}`,
            {
              method: 'DELETE',
            },
          );

          if (!response.ok) {
            throw new Error('Failed to remove installation');
          }

          span.setAttribute('installation_removed', true);
          toast.success('Installation removed successfully');
          await fetchInstallations();
        } catch (error) {
          console.error('Error removing installation:', error);
          Sentry.captureException(error);
          toast.error('Failed to remove installation');
        } finally {
          setRemovingIds((prev) => {
            const next = new Set(prev);
            next.delete(installationId);
            return next;
          });
        }
      },
    );
  };

  const handleAddMore = async () => {
    Sentry.startSpan(
      {
        op: 'ui.click',
        name: 'Add More Repositories Click',
      },
      async () => {
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
          window.location.href = data.url;
        } catch (error) {
          console.error('Failed to connect GitHub App:', error);
          Sentry.captureException(error);
          toast.error('Failed to connect GitHub. Please try again.');
        }
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingDots color="#808080" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">
          GitHub App Installations
        </h1>
        <p className="text-stone-600">
          Manage your GitHub App installations and repository access
        </p>
      </div>

      {installations.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-8 text-center">
          <GithubIcon className="h-12 w-12 mx-auto mb-4 text-stone-400" />
          <h3 className="text-lg font-semibold text-stone-900 mb-2">
            No GitHub App installations
          </h3>
          <p className="text-sm text-stone-600 mb-6">
            Connect your GitHub repositories to get started with Flowershow
          </p>
          <button
            onClick={handleAddMore}
            className="inline-flex h-10 items-center justify-center space-x-2 rounded-md border border-black bg-black px-6 text-sm text-white transition-all hover:bg-white hover:text-black focus:outline-none"
          >
            <GithubIcon className="h-4 w-4" />
            <span>Connect GitHub Repositories</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={handleAddMore}
              className="inline-flex h-10 items-center justify-center space-x-2 rounded-md border border-black bg-black px-4 text-sm text-white transition-all hover:bg-white hover:text-black focus:outline-none"
            >
              <span>Add More Repositories</span>
            </button>
          </div>

          {installations.map((installation) => {
            const isSyncing = syncingIds.has(installation.id);
            const isRemoving = removingIds.has(installation.id);

            return (
              <div
                key={installation.id}
                className="rounded-md border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <GithubIcon className="h-6 w-6 text-stone-700" />
                    <div>
                      <h3 className="text-lg font-semibold text-stone-900">
                        {installation.accountLogin}
                      </h3>
                      <p className="text-sm text-stone-600">
                        {installation.accountType} •{' '}
                        {installation.repositories.length} repositor
                        {installation.repositories.length !== 1 ? 'ies' : 'y'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSync(installation.id)}
                      disabled={isSyncing || isRemoving}
                      className={cn(
                        'flex h-9 items-center justify-center rounded-md border px-3 text-sm transition-all focus:outline-none',
                        isSyncing || isRemoving
                          ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                      )}
                    >
                      {isSyncing ? <LoadingDots color="#808080" /> : 'Sync'}
                    </button>
                    <a
                      href={`https://github.com/settings/installations`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 transition-all hover:bg-stone-50 focus:outline-none"
                    >
                      Manage on GitHub
                    </a>
                    <button
                      onClick={() =>
                        handleRemove(installation.id, installation.accountLogin)
                      }
                      disabled={isSyncing || isRemoving}
                      className={cn(
                        'flex h-9 items-center justify-center rounded-md border px-3 text-sm transition-all focus:outline-none',
                        isSyncing || isRemoving
                          ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                          : 'border-red-200 bg-white text-red-600 hover:bg-red-50',
                      )}
                    >
                      {isRemoving ? <LoadingDots color="#dc2626" /> : 'Remove'}
                    </button>
                  </div>
                </div>

                {installation.repositories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-stone-700 mb-2">
                      Accessible Repositories:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {installation.repositories.map((repo) => (
                        <div
                          key={repo.id}
                          className="flex items-center space-x-2 text-sm text-stone-600 bg-stone-50 rounded px-3 py-2"
                        >
                          <span>{repo.fullName}</span>
                          {repo.isPrivate && (
                            <span
                              className="text-xs"
                              title="Private repository"
                            >
                              🔒
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-stone-500 mt-4">
                  Installed on{' '}
                  {new Date(installation.createdAt).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
