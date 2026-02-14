'use client';

import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import GitHubConnectionCard from '@/components/dashboard/github-connection-card';
import { GithubIcon } from '@/components/icons';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import { useModal } from '@/providers/modal-provider';
import { SiteUpdateKey } from '@/server/api/types';
import { api } from '@/trpc/react';

interface GitHubConnectionFormProps {
  siteId: string;
  ghRepository: string | null;
  ghBranch: string | null;
  rootDir: string | null;
}

type Installation = {
  id: string;
  accountLogin: string;
  repositories: {
    id: string;
    repositoryName: string;
    repositoryFullName: string;
    isPrivate: boolean;
  }[];
};

export default function GitHubConnectionForm({
  siteId,
  ghRepository,
  ghBranch,
  rootDir,
}: GitHubConnectionFormProps) {
  const router = useRouter();
  const modal = useModal();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [editedRootDir, setEditedRootDir] = useState(rootDir || '');
  const [isSavingRootDir, setIsSavingRootDir] = useState(false);
  const [pendingOpenModal, setPendingOpenModal] = useState(false);

  const isConnected = !!ghRepository;
  const rootDirChanged = editedRootDir !== (rootDir || '');

  // Fetch installations when not connected
  const {
    data: installations = [],
    isLoading: isLoadingInstallations,
    refetch: refetchInstallations,
  } = api.github.listInstallations.useQuery(undefined, {
    enabled: !isConnected,
  });

  const handleRefreshInstallations = useCallback(async () => {
    await refetchInstallations();
  }, [refetchInstallations]);

  // Open modal when loading completes and user clicked the button
  useEffect(() => {
    if (pendingOpenModal && !isLoadingInstallations) {
      setPendingOpenModal(false);
      modal?.show(
        <ConnectGitHubModal
          siteId={siteId}
          installations={installations}
          onRefreshInstallations={handleRefreshInstallations}
          onSuccess={() => {
            modal.hide();
            router.refresh();
          }}
          onCancel={() => modal.hide()}
        />,
      );
    }
  }, [
    pendingOpenModal,
    isLoadingInstallations,
    modal,
    siteId,
    installations,
    handleRefreshInstallations,
    router,
  ]);

  const disconnectGitHub = api.site.disconnectGitHub.useMutation({
    onSuccess: () => {
      toast.success('GitHub repository disconnected');
      setIsDisconnecting(false);
      router.refresh();
    },
    onError: (error) => {
      console.error('Disconnect failed:', error);
      Sentry.captureException(error);
      toast.error(error.message || 'Failed to disconnect GitHub');
      setIsDisconnecting(false);
    },
  });

  const updateSite = api.site.update.useMutation({
    onSuccess: () => {
      toast.success('Root directory updated. Syncing content...');
      setIsSavingRootDir(false);
      router.refresh();
    },
    onError: (error) => {
      console.error('Update failed:', error);
      Sentry.captureException(error);
      toast.error(error.message || 'Failed to update root directory');
      setIsSavingRootDir(false);
    },
  });

  const handleDisconnect = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect this site from GitHub? Your existing content will remain, but auto-sync will be disabled.',
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    Sentry.startSpan(
      {
        op: 'ui.click',
        name: 'Disconnect GitHub',
      },
      async (span) => {
        span.setAttribute('site_id', siteId);
        await disconnectGitHub.mutateAsync({ siteId });
      },
    );
  };

  const handleSaveRootDir = async () => {
    setIsSavingRootDir(true);
    Sentry.startSpan(
      {
        op: 'ui.click',
        name: 'Update Root Directory',
      },
      async (span) => {
        span.setAttribute('site_id', siteId);
        await updateSite.mutateAsync({
          id: siteId,
          key: SiteUpdateKey.rootDir,
          value: editedRootDir,
        });
      },
    );
  };

  const handleOpenConnectModal = () => {
    if (isLoadingInstallations) {
      setPendingOpenModal(true);
      return;
    }
    modal?.show(
      <ConnectGitHubModal
        siteId={siteId}
        installations={installations}
        onRefreshInstallations={handleRefreshInstallations}
        onSuccess={() => {
          modal.hide();
          router.refresh();
        }}
        onCancel={() => modal.hide()}
      />,
    );
  };

  const isButtonLoading = pendingOpenModal && isLoadingInstallations;

  // Not connected - show button to open modal
  if (!isConnected) {
    return (
      <div
        id="ghIntegration"
        className="rounded-lg border border-stone-200 bg-white"
      >
        <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
          <h2 className="font-dashboard-heading text-xl">GitHub Integration</h2>
          <p className="text-sm text-stone-500">
            Connect a GitHub repository to automatically sync content.
            Currently, this site is published via CLI or Obsidian plugin.
          </p>

          <button
            onClick={handleOpenConnectModal}
            disabled={isButtonLoading}
            className={cn(
              'flex h-10 w-full items-center justify-center space-x-2 rounded-md border px-4 text-sm font-medium transition-all focus:outline-none sm:w-auto',
              isButtonLoading
                ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                : 'border-stone-900 text-stone-900 hover:bg-stone-50',
            )}
          >
            {isButtonLoading ? (
              <LoadingDots color="#808080" />
            ) : (
              <>
                <GithubIcon className="h-4 w-4" />
                <span>Connect GitHub Repository</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Connected - show repository info with disconnect option
  return (
    <div
      id="ghIntegration"
      className="rounded-lg border border-stone-200 bg-white"
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-dashboard-heading text-xl">GitHub Integration</h2>
        <p className="text-sm text-stone-500">
          This site is connected to a GitHub repository. Content is synced from
          GitHub.
        </p>

        <div className="space-y-4">
          {/* Repository */}
          <div>
            <a
              href={`https://github.com/${ghRepository}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex gap-2 items-center justify-center rounded-full border border-stone-300 bg-white py-1 px-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <GithubIcon className="h-4 w-4" />
              {ghRepository}
            </a>
          </div>

          {/* Branch */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-stone-500">Branch</label>
            <input
              type="text"
              value={ghBranch || ''}
              disabled
              className="w-full rounded-md border border-stone-200 bg-stone-100 px-4 py-2 text-sm text-stone-600"
            />
          </div>

          {/* Root Directory */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-stone-500">
              Root Directory
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editedRootDir}
                onChange={(e) => setEditedRootDir(e.target.value)}
                placeholder="Repository root"
                className="flex-1 rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black"
              />
              {rootDirChanged && (
                <button
                  onClick={handleSaveRootDir}
                  disabled={isSavingRootDir}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition-all focus:outline-none',
                    isSavingRootDir
                      ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                      : 'border-black bg-black text-white hover:bg-white hover:text-black',
                  )}
                >
                  {isSavingRootDir ? (
                    <LoadingDots color="#808080" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              )}
            </div>
            <span className="text-xs text-stone-500">
              The directory within your repository where content is located.
              Leave empty to use the repository root.
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between space-y-2 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 sm:flex-row sm:space-y-0 sm:px-10">
        <p className="text-sm text-stone-500">
          Disconnect to publish via CLI or Obsidian plugin instead.
        </p>
        <div className="flex w-full flex-col space-y-2 sm:w-auto sm:flex-row sm:space-x-2 sm:space-y-0">
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className={cn(
              'flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm font-medium transition-all focus:outline-none sm:w-auto',
              isDisconnecting
                ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                : 'border-red-600 bg-white text-red-600 hover:bg-red-600 hover:text-white',
            )}
          >
            {isDisconnecting ? <LoadingDots color="#dc2626" /> : 'Disconnect'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal component for connecting GitHub
function ConnectGitHubModal({
  siteId,
  installations,
  onRefreshInstallations,
  onSuccess,
  onCancel,
}: {
  siteId: string;
  installations: Installation[];
  onRefreshInstallations: () => Promise<void>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const getInstallationUrl = api.github.getInstallationUrl.useMutation();

  const [data, setData] = useState({
    selectedAccount: '',
    ghRepository: '',
    ghBranch: 'main',
    rootDir: '',
    installationId: '',
  });

  // Listen for postMessage from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const expectedOrigin = window.location.origin;
      if (event.origin !== expectedOrigin) {
        return;
      }

      if (event.data?.type === 'github-app-installed') {
        onRefreshInstallations();
        router.refresh();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onRefreshInstallations, router]);

  // Auto-select first account and repository when installations load
  useEffect(() => {
    if (installations.length > 0) {
      const firstInstallation = installations[0];
      if (firstInstallation) {
        setData((prev) => ({
          ...prev,
          selectedAccount: firstInstallation.accountLogin,
          ghRepository:
            firstInstallation.repositories[0]?.repositoryFullName ?? '',
          installationId: firstInstallation.id,
        }));
      }
    }
  }, [installations]);

  const { isPending: isConnecting, mutate: connectGitHub } =
    api.site.connectGitHub.useMutation({
      onSuccess: () => {
        toast.success('GitHub repository connected! Syncing content...');
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const selectedInstallation = installations.find(
    (inst) => inst.accountLogin === data.selectedAccount,
  );
  const filteredRepositories = selectedInstallation
    ? selectedInstallation.repositories.map((repo) => ({
        ...repo,
        installationId: selectedInstallation.id,
        accountLogin: selectedInstallation.accountLogin,
      }))
    : [];

  const handleAccountChange = (accountLogin: string) => {
    const installation = installations.find(
      (inst) => inst.accountLogin === accountLogin,
    );
    if (installation) {
      setData({
        ...data,
        selectedAccount: accountLogin,
        ghRepository: installation.repositories[0]?.repositoryFullName ?? '',
        installationId: installation.id,
      });
    }
  };

  const handleRepositoryChange = (fullName: string) => {
    const installation = installations.find((inst) =>
      inst.repositories.some((r) => r.repositoryFullName === fullName),
    );
    if (installation) {
      setData({
        ...data,
        ghRepository: fullName,
        installationId: installation.id,
      });
    }
  };

  const handleChangeGitHubAppPermissions = async () => {
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
      }
    } catch (error) {
      console.error('Failed to get installation URL:', error);
      toast.error('Failed to get installation URL');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!data.installationId) {
      toast.error('Please connect GitHub repositories first');
      return;
    }

    connectGitHub({
      siteId,
      ghRepository: data.ghRepository,
      ghBranch: data.ghBranch,
      rootDir: data.rootDir || undefined,
      installationId: data.installationId,
    });
  };

  // Show GitHub connection card if no installations
  if (installations.length === 0) {
    return (
      <div className="w-full max-w-xl rounded-md bg-white md:border md:border-stone-200 md:shadow">
        <div className="relative flex flex-col space-y-6 p-5 md:p-10">
          <h2 className="font-dashboard-heading text-2xl">
            Connect GitHub Repository
          </h2>
          <GitHubConnectionCard onRefresh={onRefreshInstallations} />
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-6 text-sm font-medium text-stone-700 transition-all hover:bg-stone-50 focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl rounded-md bg-white md:border md:border-stone-200 md:shadow"
    >
      <div className="relative flex flex-col space-y-4 p-5 md:p-10">
        <h2 className="font-dashboard-heading text-2xl">
          Connect GitHub Repository
        </h2>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="selectedAccount"
            className="text-sm font-medium text-stone-500"
          >
            <span className="flex items-center space-x-1">
              <GithubIcon className="h-4 w-4" />
              <span>GitHub Account</span>
            </span>
          </label>
          <select
            aria-label="GitHub Account"
            name="selectedAccount"
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black"
            value={data.selectedAccount}
            required
            onChange={(e) => handleAccountChange(e.target.value)}
          >
            {installations.map((installation) => (
              <option key={installation.id} value={installation.accountLogin}>
                {installation.accountLogin}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-500 mt-1">
            Missing GitHub account?{' '}
            <button
              type="button"
              onClick={handleChangeGitHubAppPermissions}
              className="text-sky-500 hover:underline"
            >
              Add GitHub account →
            </button>
          </p>
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="ghRepository"
            className="text-sm font-medium text-stone-500"
          >
            <span>Repository</span>
          </label>
          <select
            aria-label="Repository"
            name="ghRepository"
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black"
            value={data.ghRepository}
            required
            disabled={
              !data.selectedAccount || filteredRepositories.length === 0
            }
            onChange={(e) => handleRepositoryChange(e.target.value)}
          >
            {filteredRepositories.length === 0 && data.selectedAccount && (
              <option value="" disabled>
                No repositories available for this account
              </option>
            )}
            {filteredRepositories.map((repo) => (
              <option key={repo.id} value={repo.repositoryFullName}>
                {repo.repositoryName} {repo.isPrivate ? '🔒' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-500 mt-1">
            Missing Git repository?{' '}
            <button
              type="button"
              onClick={handleChangeGitHubAppPermissions}
              className="text-sky-500 hover:underline"
            >
              Adjust GitHub App Permissions →
            </button>
          </p>
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="ghBranch"
            className="text-sm font-medium text-stone-500"
          >
            <span>Branch</span>
          </label>
          <input
            name="ghBranch"
            type="text"
            value={data.ghBranch}
            onChange={(e) => setData({ ...data, ghBranch: e.target.value })}
            maxLength={32}
            required
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black"
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="rootDir"
            className="text-sm font-medium text-stone-500"
          >
            <span>Root Dir</span>
          </label>
          <input
            name="rootDir"
            type="text"
            value={data.rootDir}
            onChange={(e) => setData({ ...data, rootDir: e.target.value })}
            maxLength={32}
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black"
          />
          <span className="text-xs text-stone-500">
            The directory within your project, in which your content is located.
            Leave empty if you want to publish the whole repository.
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-3 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 md:px-10">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-6 text-sm font-medium text-stone-700 transition-all hover:bg-stone-50 focus:outline-none"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isConnecting || !data.ghRepository}
          className={cn(
            'flex h-10 items-center justify-center space-x-2 rounded-md border px-6 text-sm font-medium transition-all focus:outline-none',
            isConnecting || !data.ghRepository
              ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
              : 'border-black bg-black text-white hover:bg-white hover:text-black',
          )}
        >
          {isConnecting ? (
            <LoadingDots color="#808080" />
          ) : (
            'Connect Repository'
          )}
        </button>
      </div>
    </form>
  );
}
