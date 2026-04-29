import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import SettingsNav from '@/components/dashboard/settings-nav';
import type { SiteUpdateKey } from '@/server/api/types';
import { api } from '@/trpc/server';

export default async function ContentSettingsPage(props: {
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
    await api.site.updateConfigJson.mutate({
      siteId: id,
      config: { [key]: parsed },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
        <Form
          title="Show Table of Contents"
          description="Show a table of contents on pages that have headings."
          inputAttrs={{
            name: 'showToc',
            type: 'text',
            defaultValue: Boolean(siteConfig?.showToc).toString(),
          }}
          handleSubmit={updateConfigJson}
        />

        <Form
          title="Show Sidebar"
          description="Show the file-tree sidebar on your site."
          inputAttrs={{
            name: 'showSidebar',
            type: 'text',
            defaultValue: Boolean(site.showSidebar).toString(),
          }}
          handleSubmit={updateSite}
        />

        <Form
          title="RSS Feed"
          description="Enable an RSS feed for your site. Only pages with a date field in the frontmatter will be included."
          helpText={
            <p>
              Learn more about{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/rss-feed"
              >
                RSS Feed
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
          }
          inputAttrs={{
            name: 'enableRss',
            type: 'text',
            defaultValue: Boolean(site?.enableRss).toString(),
          }}
          handleSubmit={updateSite}
        />

        <Form
          title="Show Raw Markdown Link"
          description="Show a 'View raw markdown' link at the bottom of each page, linking to the raw Markdown source."
          inputAttrs={{
            name: 'showRawLink',
            type: 'text',
            defaultValue: Boolean(site?.showRawLink).toString(),
          }}
          handleSubmit={updateSite}
        />
      </div>
    </div>
  );
}
