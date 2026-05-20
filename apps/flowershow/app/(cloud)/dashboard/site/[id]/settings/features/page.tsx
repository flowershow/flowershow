import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { SITE_CONFIG_DEFAULTS } from '@/lib/site-config';
import { api } from '@/trpc/server';

export default async function FeaturesSettingsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) notFound();

  const siteConfig = await api.site.getDbConfig
    .query({ siteId: site.id })
    .catch(() => null);

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
    const configValue = parsed === '' ? null : parsed;
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { [key]: configValue },
    });
  };

  const updateGiscusConfig = async ({
    id,
    key,
    value,
  }: {
    id: string;
    key: string;
    value: string;
  }) => {
    'use server';
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { giscus: { [key]: value || null } },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
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
              ? Boolean(
                  siteConfig?.enableSearch ?? SITE_CONFIG_DEFAULTS.enableSearch,
                ).toString()
              : 'false',
          }}
          handleSubmit={updateConfigJson}
        />

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
            defaultValue: Boolean(
              siteConfig?.enableComments ?? SITE_CONFIG_DEFAULTS.enableComments,
            ).toString(),
          }}
          handleSubmit={updateConfigJson}
        />

        {(siteConfig?.enableComments ??
          SITE_CONFIG_DEFAULTS.enableComments) && (
          <>
            <Form
              title="Giscus Repository ID"
              description="The ID of your GitHub repository for Giscus."
              helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your repository, the Repository ID will be shown in the configuration section. It starts with 'R_'."
              inputAttrs={{
                name: 'repoId',
                type: 'text',
                defaultValue: siteConfig?.giscus?.repoId ?? '',
                placeholder: 'R_kgDOxxxxxx',
                required: false,
              }}
              handleSubmit={updateGiscusConfig}
            />

            <Form
              title="Giscus Category ID"
              description="The ID of the discussion category in your repository."
              helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your discussion category, the Category ID will be shown in the configuration section. It starts with 'DIC_'."
              inputAttrs={{
                name: 'categoryId',
                type: 'text',
                defaultValue: siteConfig?.giscus?.categoryId ?? '',
                placeholder: 'DIC_kwDOxxxxxx',
                required: false,
              }}
              handleSubmit={updateGiscusConfig}
            />
          </>
        )}

        <Form
          title="Show Edit Link"
          description="Show a link at the bottom of each page for readers to edit the source on GitHub."
          inputAttrs={{
            name: 'showEditLink',
            type: 'text',
            defaultValue: Boolean(
              siteConfig?.showEditLink ?? SITE_CONFIG_DEFAULTS.showEditLink,
            ).toString(),
          }}
          handleSubmit={updateConfigJson}
        />
      </div>
    </div>
  );
}
