import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { api } from '@/trpc/server';

export default async function AppearanceSettingsPage(props: {
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

  const themeConfig =
    typeof siteConfig?.theme === 'object' ? siteConfig.theme : undefined;

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
    const parsed = value === 'true' ? true : value === 'false' ? false : value;
    const configValue = parsed === '' ? null : parsed;
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { [key]: configValue },
    });
  };

  const updateThemeConfig = async ({
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
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { theme: { [key]: configValue } },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <Form
          title="Theme"
          description="Name of the theme to apply to your site."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/themes"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          inputAttrs={{
            name: 'theme',
            type: 'select',
            defaultValue:
              (typeof siteConfig?.theme === 'string'
                ? siteConfig.theme
                : themeConfig?.theme) ?? '',
            required: false,
            options: [
              { value: '', label: 'Default' },
              { value: 'letterpress', label: 'Letterpress' },
              { value: 'superstack', label: 'Superstack' },
              { value: 'lessflowery', label: 'Lessflowery' },
              { value: 'leaf', label: 'Leaf' },
            ],
          }}
          handleSubmit={updateThemeConfig}
        />

        <Form
          title="Default Color Mode"
          description="The default color mode for your site."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/dark-mode"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          inputAttrs={{
            name: 'defaultMode',
            type: 'select',
            defaultValue: themeConfig?.defaultMode ?? 'system',
            options: [
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ],
          }}
          handleSubmit={updateThemeConfig}
        />

        <Form
          title="Show Mode Switch"
          description="Show a toggle that lets visitors switch between light and dark mode."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/dark-mode"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          inputAttrs={{
            name: 'showModeSwitch',
            type: 'text',
            defaultValue: Boolean(themeConfig?.showModeSwitch).toString(),
          }}
          handleSubmit={updateThemeConfig}
        />

        <Form
          title="Show Flowershow Branding"
          description="Show 'Built with Flowershow' button on your site."
          disabled={!isFeatureEnabled(Feature.NoBranding, site)}
          inputAttrs={{
            name: 'showBuiltWithButton',
            type: 'text',
            defaultValue: isFeatureEnabled(Feature.NoBranding, site)
              ? Boolean(siteConfig?.showBuiltWithButton).toString()
              : 'true',
          }}
          handleSubmit={updateDbConfig}
        />
      </div>
    </div>
  );
}
