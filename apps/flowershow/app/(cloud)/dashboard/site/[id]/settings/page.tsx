import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import DeleteSiteForm from '@/components/dashboard/form/delete-site-form';
import ImageUploadForm from '@/components/dashboard/form/image-upload-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import type { SiteUpdateKey } from '@/server/api/types';
import { api } from '@/trpc/server';

export default async function SiteSettingsIndex(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) {
    notFound();
  }

  const siteConfig = await api.site.getDbConfig
    .query({ siteId: site.id })
    .catch(() => null);

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
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { [key]: value || null },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <Form
          title="Name"
          description="The name of your site. It can only consist of ASCII letters, digits, and characters ., -, and _. Maximum 32 characters can be used."
          inputAttrs={{
            name: 'projectName',
            type: 'text',
            defaultValue: site.projectName,
            placeholder: 'site name',
            maxLength: 32,
            pattern: '^[a-zA-Z0-9_.-]+$',
          }}
          handleSubmit={updateSite}
        />

        <Form
          title="Site Title"
          description="Your site name, appended as a suffix to every page title. Appears in browser tabs, search results, social shares, and bookmarks."
          helpText={
            <p>
              Learn more about{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/seo-social-metadata"
              >
                SEO &amp; social metadata
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          inputAttrs={{
            name: 'title',
            type: 'text',
            defaultValue: siteConfig?.title ?? '',
            placeholder: 'My Awesome Site',
          }}
          handleSubmit={updateDbConfig}
        />

        <Form
          title="Description"
          description="A short description of your site, used in search results and social previews."
          helpText={
            <p>
              Learn more about{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/seo-social-metadata"
              >
                SEO &amp; social metadata
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          inputAttrs={{
            name: 'description',
            type: 'text',
            defaultValue: siteConfig?.description ?? '',
            placeholder: 'A site about...',
          }}
          handleSubmit={updateDbConfig}
        />

        <ImageUploadForm
          title="Favicon"
          description="Image shown as the browser tab icon. Upload a PNG, JPG, or WebP — or set an emoji via config.json."
          helpText={
            <p>
              PNG, JPG, or WebP. Will be resized to 128×128.{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/custom-favicon"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          field="favicon"
          configKey="favicon"
          currentValue={siteConfig?.favicon ?? null}
        />

        <ImageUploadForm
          title="Social Image"
          description="Default image shown when sharing links on social media."
          helpText={
            <p>
              Recommended: 1200×630px. PNG, JPG, or WebP.{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/seo-social-metadata"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          field="image"
          configKey="image"
          currentValue={siteConfig?.image ?? null}
        />

        <DeleteSiteForm siteName={site.projectName} />
      </div>
    </div>
  );
}
