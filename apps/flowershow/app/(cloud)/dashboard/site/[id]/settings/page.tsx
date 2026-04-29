import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
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

  const siteConfig = await api.site.getConfig
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
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { [key]: value || undefined },
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
          title="Markdown or MDX"
          description="Choose how to process your markdown files: Markdown (md), MDX (mdx), or auto-detect based on file extension (auto)."
          helpText={
            <p>
              Learn more about{' '}
              <a
                className="underline"
                href="https://flowershow.app/blog/announcing-syntax-mode-configuration"
              >
                Syntax mode
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          inputAttrs={{
            name: 'syntaxMode',
            type: 'select',
            defaultValue: site.syntaxMode,
            options: [
              { value: 'auto', label: 'Auto-detect' },
              { value: 'md', label: 'Markdown (md)' },
              { value: 'mdx', label: 'MDX (mdx)' },
            ],
          }}
          handleSubmit={updateSite}
        />

        <Form
          title="Site Title"
          description="The display title of your site, used in the browser tab and social previews."
          inputAttrs={{
            name: 'title',
            type: 'text',
            defaultValue: siteConfig?.title ?? '',
            placeholder: 'My Awesome Site',
          }}
          handleSubmit={updateConfigJson}
        />

        <Form
          title="Description"
          description="A short description of your site, used in search results and social previews."
          inputAttrs={{
            name: 'description',
            type: 'text',
            defaultValue: siteConfig?.description ?? '',
            placeholder: 'A site about...',
          }}
          handleSubmit={updateConfigJson}
        />

        <Form
          title="Favicon"
          description="URL or emoji to use as the site favicon. Accepts a path to an image or a single emoji character."
          inputAttrs={{
            name: 'favicon',
            type: 'text',
            defaultValue: siteConfig?.favicon ?? '',
            placeholder: '🌸 or /favicon.ico',
          }}
          handleSubmit={updateConfigJson}
        />

        <Form
          title="Social Image"
          description="URL of the default social preview image shown when sharing links."
          inputAttrs={{
            name: 'image',
            type: 'text',
            defaultValue: siteConfig?.image ?? '',
            placeholder: '/social.png',
          }}
          handleSubmit={updateConfigJson}
        />
      </div>
    </div>
  );
}
