import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import JsonForm from '@/components/dashboard/json-form';
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

  const siteConfig = await api.site.getConfig
    .query({ siteId: site.id })
    .catch(() => null);

  const themeConfig =
    typeof siteConfig?.theme === 'object' ? siteConfig.theme : undefined;

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

  const updateNavLinks = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { nav: { links: value as never } },
    });
  };

  const updateSocial = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { social: value as never },
    });
  };

  const updateFooterNavigation = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { footer: { navigation: value as never } },
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
              ? Boolean(siteConfig?.showBuiltWithButton ?? true).toString()
              : 'true',
          }}
          handleSubmit={updateConfigJson}
        />

        <JsonForm
          title="Nav Links"
          description="Navigation items shown in the header. Each item needs 'name' and 'href'. Dropdowns use 'name' and 'links' (array of {name, href})."
          helpText='Example: [{"name":"Blog","href":"/blog"}]'
          fieldName="nav.links"
          defaultValue={siteConfig?.nav?.links ?? null}
          handleSubmit={updateNavLinks}
        />

        <JsonForm
          title="Social Links"
          description='Social platform links shown in the nav and footer. Each item needs "name", "href", and optionally "label" (platform, e.g. "github", "twitter").'
          helpText='Example: [{"name":"GitHub","href":"https://github.com/you","label":"github"}]'
          fieldName="social"
          defaultValue={siteConfig?.social ?? null}
          handleSubmit={updateSocial}
        />

        <JsonForm
          title="Footer Navigation"
          description='Navigation groups in the footer. Each group needs "title" and "links" (array of {name, href}).'
          helpText='Example: [{"title":"Docs","links":[{"name":"Getting Started","href":"/docs"}]}]'
          fieldName="footer.navigation"
          defaultValue={siteConfig?.footer?.navigation ?? null}
          handleSubmit={updateFooterNavigation}
        />
      </div>
    </div>
  );
}
