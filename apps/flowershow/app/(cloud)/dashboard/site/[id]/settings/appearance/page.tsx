import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import type { SiteUpdateKey } from '@/server/api/types';
import { api } from '@/trpc/server';

export default async function AppearanceSettingsPage(props: {
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

  const themeConfig =
    typeof siteConfig?.theme === 'object' ? siteConfig.theme : undefined;

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

  const updateNavConfig = async ({
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
      config: { nav: { [key]: value || undefined } },
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
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { theme: { [key]: parsed || undefined } },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <Form
          title="Nav Logo"
          description="URL or path to the logo image shown in the navigation bar."
          inputAttrs={{
            name: 'logo',
            type: 'text',
            defaultValue:
              (typeof siteConfig?.nav === 'object'
                ? siteConfig.nav?.logo
                : undefined) ?? '',
            placeholder: '/logo.png',
            required: false,
          }}
          handleSubmit={updateNavConfig}
        />

        <Form
          title="Nav Title"
          description="The title shown in the site navigation bar."
          inputAttrs={{
            name: 'title',
            type: 'text',
            defaultValue:
              (typeof siteConfig?.nav === 'object'
                ? siteConfig.nav?.title
                : undefined) ?? '',
            placeholder: 'My Site',
            required: false,
          }}
          handleSubmit={updateNavConfig}
        />

        <Form
          title="Theme"
          description="Name of the theme to apply to your site."
          inputAttrs={{
            name: 'theme',
            type: 'text',
            defaultValue:
              (typeof siteConfig?.theme === 'string'
                ? siteConfig.theme
                : themeConfig?.theme) ?? '',
            placeholder: 'default',
            required: false,
          }}
          handleSubmit={updateThemeConfig}
        />

        <Form
          title="Default Color Mode"
          description="The default color mode for your site."
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
              ? Boolean(site?.showBuiltWithButton).toString()
              : 'true',
          }}
          handleSubmit={updateSite}
        />
      </div>
    </div>
  );
}
