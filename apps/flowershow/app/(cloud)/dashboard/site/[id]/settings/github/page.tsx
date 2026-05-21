import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import GitHubConnectionForm from '@/components/dashboard/form/github-connection-form';
import RepoAccessLostForm from '@/components/dashboard/form/repo-access-lost-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { getRepoFullName } from '@/lib/get-repo-full-name';
import type { SiteUpdateKey } from '@/server/api/types';
import { api } from '@/trpc/server';

export default async function GitHubSettingsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) notFound();

  const repoFullName = getRepoFullName(site);

  const isRepoAccessLost = !site.installationRepository && !!site.ghRepository;
  let hasInstallationForRepo = false;

  if (isRepoAccessLost) {
    try {
      const installations = await api.github.listInstallations.query();
      hasInstallationForRepo = installations.some((installation) =>
        installation.repositories.some(
          (repo) => repo.repositoryFullName === site.ghRepository,
        ),
      );
    } catch (error) {
      console.error('Failed to fetch installations:', error);
    }
  }

  const updateSite = async ({
    id,
    key,
    value,
  }: {
    id: string;
    key: SiteUpdateKey;
    value: string;
  }) => {
    'use server';
    await api.site.update.mutate({ id, key, value });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!repoFullName} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        {isRepoAccessLost && (
          <RepoAccessLostForm
            siteId={site.id}
            repositoryName={site.ghRepository ?? ''}
            hasInstallation={hasInstallationForRepo}
          />
        )}

        <GitHubConnectionForm
          siteId={site.id}
          ghRepository={repoFullName}
          ghBranch={site.ghBranch}
          rootDir={site.rootDir}
        />

        {repoFullName && (
          <Form
            title="Auto-sync"
            description="Automatically sync your site after each change to the GitHub repository."
            helpText={
              <p>
                Learn more about{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/getting-started/from-github"
                >
                  Publishing from GitHub
                  <ExternalLinkIcon className="inline h-4" />
                </a>
                .
              </p>
            }
            inputAttrs={{
              name: 'autoSync',
              type: 'text',
              defaultValue: Boolean(site.autoSync).toString(),
            }}
            handleSubmit={updateSite}
          />
        )}
      </div>
    </div>
  );
}
