import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { api } from '@/trpc/server';

export default async function AnalyticsSettingsPage(props: {
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

  const updateDbConfig = async ({
    id,
    key,
    value,
  }: {
    id: string;
    key: string;
    value: string;
  }) => {
    'use server';
    const configValue = value === '' ? null : value;
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { [key]: configValue },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <Form
          title="Analytics"
          description="Google Analytics measurement ID (e.g. G-XXXXXXXXXX)."
          helpText={
            <p>
              Learn more about{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/analytics"
              >
                Analytics
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          inputAttrs={{
            name: 'analytics',
            type: 'text',
            defaultValue: siteConfig?.analytics ?? '',
            placeholder: 'G-XXXXXXXXXX',
            required: false,
          }}
          handleSubmit={updateDbConfig}
        />

        <Form
          title="Umami Analytics"
          description="Umami website ID for privacy-friendly analytics."
          helpText={
            <p>
              Find your website ID in your Umami dashboard. Self-hosted
              instances also need to configure the script src in config.json.{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/analytics"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
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
          handleSubmit={updateDbConfig}
        />
      </div>
    </div>
  );
}
