import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import ImageUploadForm from '@/components/dashboard/form/image-upload-form';
import JsonForm from '@/components/dashboard/json-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { api } from '@/trpc/server';

export default async function NavigationSettingsPage(props: {
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
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { nav: { [key]: value || null } },
    });
  };

  const updateNavLinks = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { nav: { links: value as never } },
    });
  };

  const updateSocial = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { social: value as never },
    });
  };

  const updateFooterNavigation = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
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
        <ImageUploadForm
          title="Logo"
          description="Logo image shown in the navigation bar."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/navbar"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          field="logo"
          configKey="logo"
          currentValue={siteConfig?.logo ?? null}
        />

        <Form
          title="Nav Title"
          description="The title shown in the site navigation bar."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/navbar"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
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

        <JsonForm
          title="Nav Links"
          description="Navigation items shown in the header. Each item needs 'name' and 'href'. Dropdowns use 'name' and 'links' (array of {name, href})."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/navbar"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          placeholder={'[{"name":"Blog","href":"/blog"}]'}
          fieldName="nav.links"
          defaultValue={siteConfig?.nav?.links ?? null}
          handleSubmit={updateNavLinks}
        />

        <JsonForm
          title="Social Links"
          description='Social platform links shown in the nav and footer. Each item needs "name", "href", and optionally "label" (platform, e.g. "github", "twitter").'
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/navbar"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          placeholder={
            '[{"name":"GitHub","href":"https://github.com/you","label":"github"}]'
          }
          fieldName="social"
          defaultValue={siteConfig?.social ?? null}
          handleSubmit={updateSocial}
        />

        <JsonForm
          title="Footer Navigation"
          description='Navigation groups in the footer. Each group needs "title" and "links" (array of {name, href}).'
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/footer"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          placeholder={
            '[{"title":"Docs","links":[{"name":"Getting Started","href":"/docs"}]}]'
          }
          fieldName="footer.navigation"
          defaultValue={siteConfig?.footer?.navigation ?? null}
          handleSubmit={updateFooterNavigation}
        />
      </div>
    </div>
  );
}
