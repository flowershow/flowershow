import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import GitHubConnectionForm from '@/components/dashboard/form/github-connection-form';
import RepoAccessLostForm from '@/components/dashboard/form/repo-access-lost-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { getRepoFullName } from '@/lib/get-repo-full-name';
import type { SiteUpdateKey } from '@/server/api/types';
import { api } from '@/trpc/server';

export default async function IntegrationsSettingsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) notFound();

  const siteConfig = await api.site.getConfig
    .query({ siteId: site.id })
    .catch(() => null);

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

  const updateConfigJson = async ({
    id,
    key,
    value,
  }: {
    id: string;
    key: string;
    value: string;
  }) => {
    'use server';
    const parsed = value === 'true' ? true : value === 'false' ? false : value;
    const configValue = parsed === '' ? undefined : parsed;
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { [key]: configValue },
    });
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
                  href="https://flowershow.app/docs/site-settings#auto-sync"
                >
                  Auto-Sync
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

        <Form
          title="Comments"
          description="Enable comments at the bottom of your site's pages."
          helpText={
            <p>
              Learn more about{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/comments"
              >
                Comments
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          inputAttrs={{
            name: 'enableComments',
            type: 'text',
            defaultValue: Boolean(site.enableComments).toString(),
          }}
          handleSubmit={updateSite}
        />

        {site?.enableComments && (
          <>
            <Form
              title="Giscus Repository ID"
              description="The ID of your GitHub repository for Giscus."
              helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your repository, the Repository ID will be shown in the configuration section. It starts with 'R_'."
              inputAttrs={{
                name: 'giscusRepoId',
                type: 'text',
                defaultValue: site?.giscusRepoId || '',
                placeholder: 'R_kgDOxxxxxx',
                required: false,
              }}
              handleSubmit={updateSite}
            />

            <Form
              title="Giscus Category ID"
              description="The ID of the discussion category in your repository."
              helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your discussion category, the Category ID will be shown in the configuration section. It starts with 'DIC_'."
              inputAttrs={{
                name: 'giscusCategoryId',
                type: 'text',
                defaultValue: site?.giscusCategoryId || '',
                placeholder: 'DIC_kwDOxxxxxx',
                required: false,
              }}
              handleSubmit={updateSite}
            />
          </>
        )}

        <Form
          title="Full-Text Search"
          description="Enable full-text search functionality for your site."
          helpText={
            <p>
              Learn more about{' '}
              <a
                className="underline"
                href="https://flowershow.app/blog/announcing-full-text-search"
              >
                Full-text search
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          disabled={!isFeatureEnabled(Feature.Search, site)}
          inputAttrs={{
            name: 'enableSearch',
            type: 'text',
            defaultValue: isFeatureEnabled(Feature.Search, site)
              ? Boolean(site?.enableSearch).toString()
              : 'false',
          }}
          handleSubmit={updateSite}
        />

        <Form
          title="Analytics"
          description="Google Analytics measurement ID (e.g. G-XXXXXXXXXX)."
          inputAttrs={{
            name: 'analytics',
            type: 'text',
            defaultValue: siteConfig?.analytics ?? '',
            placeholder: 'G-XXXXXXXXXX',
            required: false,
          }}
          handleSubmit={updateConfigJson}
        />

        <Form
          title="Umami Analytics"
          description="Umami website ID for privacy-friendly analytics."
          helpText="Find your website ID in your Umami dashboard. Self-hosted instances also need to configure the script src in config.json."
          inputAttrs={{
            name: 'umami',
            type: 'text',
            defaultValue:
              typeof siteConfig?.umami === 'string'
                ? siteConfig.umami
                : ((siteConfig?.umami as { websiteId?: string } | undefined)
                    ?.websiteId ?? ''),
            placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            required: false,
          }}
          handleSubmit={updateConfigJson}
        />

        <Form
          title="Show Edit Link"
          description="Show a link at the bottom of each page for readers to edit the source on GitHub."
          inputAttrs={{
            name: 'showEditLink',
            type: 'text',
            defaultValue: Boolean(siteConfig?.showEditLink).toString(),
          }}
          handleSubmit={updateConfigJson}
        />
      </div>
    </div>
  );
}
