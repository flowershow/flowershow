'use client';

import { CheckCircleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import GitHubConnectionCard from '@/components/dashboard/github-connection-card';
import { GithubIcon } from '@/components/icons';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import Modal from '@/providers/modal';
import { api } from '@/trpc/react';

type Step = 'connect' | 'select' | 'syncing' | 'success';

interface GitHubSyncModalProps {
  siteId: string;
  siteUrl: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function GitHubSyncModal({
  siteId,
  siteUrl,
  showModal,
  setShowModal,
}: GitHubSyncModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('connect');
  const [data, setData] = useState({
    selectedAccount: '',
    ghRepository: '',
    ghBranch: 'main',
    rootDir: '',
    installationId: '',
  });

  const {
    data: installations = [],
    isLoading: isLoadingInstallations,
    refetch: refetchInstallations,
  } = api.github.listInstallations.useQuery(undefined, {
    enabled: showModal,
  });

  const getInstallationUrl = api.github.getInstallationUrl.useMutation();

  // Move to select step when installations are available
  useEffect(() => {
    if (installations.length > 0 && step === 'connect') {
      const first = installations[0]!;
      setData((prev) => ({
        ...prev,
        selectedAccount: first.accountLogin,
        ghRepository: first.repositories[0]?.repositoryFullName ?? '',
        installationId: first.id,
      }));
      setStep('select');
    }
  }, [installations, step]);

  const handleRefreshInstallations = useCallback(async () => {
    await refetchInstallations();
  }, [refetchInstallations]);

  // Listen for GitHub App install popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'github-app-installed') {
        refetchInstallations();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetchInstallations]);

  const { isPending: isConnecting, mutate: connectGitHub } =
    api.site.connectGitHub.useMutation({
      onSuccess: () => {
        setStep('syncing');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to connect repository');
      },
    });

  // Poll sync status while syncing
  const { data: syncStatus } = api.site.getSyncStatus.useQuery(
    { id: siteId },
    {
      enabled: step === 'syncing',
      refetchInterval: 3000,
    },
  );

  useEffect(() => {
    if (step === 'syncing' && syncStatus?.status === 'SUCCESS') {
      setStep('success');
    }
  }, [syncStatus, step]);

  const selectedInstallation = installations.find(
    (inst) => inst.accountLogin === data.selectedAccount,
  );
  const filteredRepositories = selectedInstallation?.repositories ?? [];

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
      if (!popup) toast.error('Please allow popups for this site');
    } catch {
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

  const handleClose = () => {
    if (isConnecting || step === 'syncing') return;
    if (step === 'success') {
      router.push(`/site/${siteId}/settings`);
      router.refresh();
    }
    setShowModal(false);
    setTimeout(() => {
      setStep(installations.length > 0 ? 'select' : 'connect');
    }, 200);
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={handleClose}
      closeOnClickOutside={!isConnecting && step !== 'syncing'}
    >
      <div className="w-full max-w-xl bg-white rounded-md md:border md:border-stone-200 md:shadow overflow-hidden">
        {/* Connect step - no installations yet */}
        {step === 'connect' && (
          <div className="relative flex flex-col space-y-6 p-5 md:p-10">
            <h2 className="font-dashboard-heading text-2xl">
              Sync with GitHub
            </h2>
            {isLoadingInstallations ? (
              <div className="flex justify-center py-8">
                <LoadingDots color="#808080" />
              </div>
            ) : (
              <GitHubConnectionCard onRefresh={handleRefreshInstallations} />
            )}
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Select repo step */}
        {step === 'select' && (
          <form onSubmit={handleSubmit}>
            <div className="relative flex flex-col space-y-4 p-5 md:p-10">
              <h2 className="font-dashboard-heading text-2xl">
                Sync with GitHub
              </h2>
              <p className="text-sm text-stone-500">
                Connect a GitHub repository to sync content to your site.
              </p>

              <div className="flex flex-col space-y-2 text-left">
                <label className="text-sm font-medium text-stone-500">
                  <span className="flex items-center space-x-1">
                    <GithubIcon className="h-4 w-4" />
                    <span>GitHub Account</span>
                  </span>
                </label>
                <select
                  aria-label="GitHub Account"
                  className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 focus:border-black focus:outline-none focus:ring-black"
                  value={data.selectedAccount}
                  required
                  onChange={(e) => handleAccountChange(e.target.value)}
                >
                  {installations.map((inst) => (
                    <option key={inst.id} value={inst.accountLogin}>
                      {inst.accountLogin}
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
                    Add GitHub account
                  </button>
                </p>
              </div>

              <div className="flex flex-col space-y-2 text-left">
                <label className="text-sm font-medium text-stone-500">
                  Repository
                </label>
                <select
                  aria-label="Repository"
                  className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 focus:border-black focus:outline-none focus:ring-black"
                  value={data.ghRepository}
                  required
                  disabled={filteredRepositories.length === 0}
                  onChange={(e) => handleRepositoryChange(e.target.value)}
                >
                  {filteredRepositories.length === 0 && (
                    <option value="" disabled>
                      No repositories available
                    </option>
                  )}
                  {filteredRepositories.map((repo) => (
                    <option key={repo.id} value={repo.repositoryFullName}>
                      {repo.repositoryName} {repo.isPrivate ? '🔒' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-stone-500 mt-1">
                  Missing repository?{' '}
                  <button
                    type="button"
                    onClick={handleChangeGitHubAppPermissions}
                    className="text-sky-500 hover:underline"
                  >
                    Adjust GitHub App permissions
                  </button>
                </p>
              </div>

              <div className="flex flex-col space-y-2 text-left">
                <label className="text-sm font-medium text-stone-500">
                  Branch
                </label>
                <input
                  type="text"
                  value={data.ghBranch}
                  onChange={(e) =>
                    setData({ ...data, ghBranch: e.target.value })
                  }
                  required
                  className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 focus:border-black focus:outline-none focus:ring-black"
                />
              </div>

              <div className="flex flex-col space-y-2 text-left">
                <label className="text-sm font-medium text-stone-500">
                  Root Directory
                </label>
                <input
                  type="text"
                  value={data.rootDir}
                  onChange={(e) =>
                    setData({ ...data, rootDir: e.target.value })
                  }
                  placeholder="Subdirectory to publish (optional)"
                  className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black"
                />
              </div>
            </div>
            <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 md:px-10 gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnecting || !data.ghRepository}
                className={cn(
                  'flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition-all',
                  isConnecting || !data.ghRepository
                    ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                    : 'border-black bg-black text-white hover:bg-white hover:text-black',
                )}
              >
                {isConnecting ? (
                  <LoadingDots color="#808080" />
                ) : (
                  'Connect & Sync'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Syncing step */}
        {step === 'syncing' && (
          <div className="p-5 md:p-10">
            <h2 className="font-dashboard-heading text-2xl text-center">
              Syncing your content
            </h2>
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-10 w-10 animate-spin text-stone-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="mt-3 text-sm text-stone-500">
                Waiting for sync to complete...
              </p>
            </div>
          </div>
        )}

        {/* Success step */}
        {step === 'success' && (
          <>
            <div className="p-5 md:p-10">
              <div className="py-8 text-center">
                <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500" />
                <p className="mt-3 text-sm font-medium text-stone-900">
                  GitHub repository connected and synced!
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Your site is ready to go.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 md:px-10 gap-3">
              <a
                href={siteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 flex-1 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition-all hover:bg-stone-50"
              >
                View site
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 flex-1 items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white transition-all hover:bg-white hover:text-black"
              >
                Go to site settings
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
