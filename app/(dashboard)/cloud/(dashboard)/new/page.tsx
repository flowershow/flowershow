'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import GitHubConnectionCard from '@/components/dashboard/github-connection-card';
import { GithubIcon } from '@/components/icons';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

export default function NewSitePage() {
  const router = useRouter();
  const getInstallationUrl = api.github.getInstallationUrl.useMutation();

  const [data, setData] = useState({
    selectedAccount: '', // Account/org selector
    ghRepository: '',
    ghBranch: 'main',
    rootDir: '',
    installationId: '',
  });

  // Use tRPC to fetch installations
  const {
    data: installations = [],
    isLoading: isLoadingInstallations,
    refetch: refetchInstallations,
  } = api.github.listInstallations.useQuery(undefined, {
    onError: (error) => {
      console.error('Failed to fetch installations:', error);
      toast.error('Failed to load GitHub installations');
    },
  });

  // Handler to refresh installations
  const handleRefreshInstallations = useCallback(async () => {
    await refetchInstallations();
  }, [refetchInstallations]);

  // Listen for postMessage from popup window
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
        console.log(
          'GitHub App installation completed, refreshing installations',
        );
        handleRefreshInstallations();
        // Force a full page refresh to ensure UI updates
        router.refresh();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleRefreshInstallations, router]);

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

  const { isPending: isCreatingSite, mutate: createSite } =
    api.site.create.useMutation({
      onSuccess: (res) => {
        router.push(`/site/${res.id}/settings`);
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // Get all available repositories from GitHub App installations
  const availableRepositories = installations.flatMap((inst) =>
    inst.repositories.map((repo) => ({
      ...repo,
      installationId: inst.id,
      accountLogin: inst.accountLogin,
    })),
  );

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
    const repo = availableRepositories.find(
      (r) => r.repositoryFullName === fullName,
    );
    if (repo) {
      setData({
        ...data,
        ghRepository: fullName,
        installationId: repo.installationId,
      });
    }
  };

  // Get repositories for the selected account
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

  // Show loading state while checking installations
  if (isLoadingInstallations) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Create a new site
          </h1>
          <p className="text-stone-600 flex items-center justify-center gap-2">
            <LoadingDots color="#57534e" />
          </p>
        </div>
      </div>
    );
  }

  // Show only GitHub connection card if no installations
  if (installations.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Create a new site
          </h1>
        </div>
        <GitHubConnectionCard onRefresh={handleRefreshInstallations} />
      </div>
    );
  }

  const handleChangeGitHubAppPermissions = async () => {
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
        return;
      }
    } catch (error) {
      console.error('Failed to get installation URL:', error);
      toast.error('Failed to get installation URL');
    }
  };

  return (
    <div className="mx-auto max-w-xl py-16 space-y-6">
      <form
        data-testid="create-site-form"
        action={async (formData: FormData) => {
          const ghRepository = formData.get('ghRepository') as string;
          const ghBranch = formData.get('ghBranch') as string;
          const rootDir = formData.get('rootDir') as string;
          const installationId = formData.get('installationId') as string;

          if (!installationId) {
            toast.error('Please connect GitHub repositories first');
            return;
          }

          createSite({
            ghRepository,
            ghBranch,
            rootDir,
            installationId,
          });
        }}
        className="w-full rounded-md bg-white  md:border md:border-stone-200 md:shadow "
      >
        <div className="relative flex flex-col space-y-4 p-5 md:p-10">
          <h2 className="font-dashboard-heading text-2xl ">
            Create a new site
          </h2>

          {/* Hidden field for installationId */}
          <input
            type="hidden"
            name="installationId"
            value={data.installationId}
          />

          <div className="flex flex-col space-y-2">
            <label
              htmlFor="selectedAccount"
              className="text-sm font-medium text-stone-500 "
            >
              <span className="flex items-center space-x-1">
                <GithubIcon className="h-4 w-4" />
                <span>GitHub Account</span>
              </span>
            </label>
            <select
              aria-label="GitHub Account"
              name="selectedAccount"
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black     "
              value={data.selectedAccount}
              required
              disabled={isLoadingInstallations || installations.length === 0}
              onChange={(e) => handleAccountChange(e.target.value)}
            >
              {isLoadingInstallations && (
                <option value="" disabled>
                  Loading...
                </option>
              )}
              {!isLoadingInstallations && installations.length === 0 && (
                <option value="" disabled>
                  Connect GitHub repositories first
                </option>
              )}
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
              className="text-sm font-medium text-stone-500 "
            >
              <span>Repository</span>
            </label>
            <select
              aria-label="Repository"
              name="ghRepository"
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black     "
              value={data.ghRepository}
              required
              disabled={
                isLoadingInstallations ||
                !data.selectedAccount ||
                filteredRepositories.length === 0
              }
              onChange={(e) => handleRepositoryChange(e.target.value)}
            >
              {isLoadingInstallations && (
                <option value="" disabled>
                  Loading...
                </option>
              )}
              {!isLoadingInstallations && installations.length === 0 && (
                <option value="" disabled>
                  Connect GitHub repositories first
                </option>
              )}
              {!isLoadingInstallations &&
                filteredRepositories.length === 0 &&
                data.selectedAccount && (
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
              className="text-sm font-medium text-stone-500 "
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
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black     "
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label
              htmlFor="rootDir"
              className="text-sm font-medium text-stone-500 "
            >
              <span>Root Dir</span>
            </label>
            <input
              name="rootDir"
              type="text"
              value={data.rootDir}
              onChange={(e) => setData({ ...data, rootDir: e.target.value })}
              maxLength={32}
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black     "
            />
            <span className="flex items-center space-x-1 text-xs">
              The directory within your project, in which your content is
              located. Leave empty if you want to publish the whole repository.
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 md:px-10">
          <button
            className={cn(
              'flex h-10 w-full items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none',
              isCreatingSite ||
                isLoadingInstallations ||
                installations.length === 0
                ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400   '
                : 'border-black bg-black text-white hover:bg-white hover:text-black     ',
            )}
            disabled={
              isCreatingSite ||
              isLoadingInstallations ||
              installations.length === 0
            }
          >
            {isCreatingSite ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>Create Site</p>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
