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

  const updateUmamiWebsiteId = async ({
    id,
    value,
  }: {
    id: string;
    key: string;
    value: string;
  }) => {
    'use server';
    // Clearing the website ID disables umami entirely (nulls the whole object).
    const configValue = value === '' ? null : { websiteId: value };
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { umami: configValue },
    });
  };

  const updateUmamiSrc = async ({
    id,
    value,
  }: {
    id: string;
    key: string;
    value: string;
  }) => {
    'use server';
    // Deep-merge preserves the existing websiteId; null src falls back to the
    // default cloud script URL at render time.
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { umami: { src: value === '' ? null : value } },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <Form
          title="Google Analytics"
          description="Google Analytics measurement ID."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/analytics"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
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
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/analytics"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          inputAttrs={{
            name: 'umami',
            type: 'text',
            defaultValue: siteConfig?.umami?.websiteId ?? '',
            placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            required: false,
          }}
          handleSubmit={updateUmamiWebsiteId}
        />

        <Form
          title="Umami Script URL"
          description="Custom script URL for self-hosted Umami instances. Leave blank to use the default Umami Cloud script."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/analytics"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          inputAttrs={{
            name: 'umamiSrc',
            type: 'url',
            defaultValue: siteConfig?.umami?.src ?? '',
            placeholder: 'https://your-umami.example.com/script.js',
            required: false,
          }}
          handleSubmit={updateUmamiSrc}
        />
      </div>
    </div>
  );
}
