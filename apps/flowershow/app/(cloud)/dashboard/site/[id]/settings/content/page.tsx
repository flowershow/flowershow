import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import JsonForm from '@/components/dashboard/json-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { api } from '@/trpc/server';

export default async function ContentSettingsPage(props: {
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
    const parsed = value === 'true' ? true : value === 'false' ? false : value;
    const configValue = parsed === '' ? null : parsed;
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { [key]: configValue },
    });
  };

  const updateContentInclude = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { contentInclude: value as never },
    });
  };

  const updateContentExclude = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { contentExclude: value as never },
    });
  };

  const updateContentHide = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { contentHide: value as never },
    });
  };

  const updateSidebarPaths = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { sidebar: { paths: value as never } },
    });
  };

  const updateRedirects = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { redirects: value as never },
    });
  };

  const updateSidebarConfig = async ({
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
      config: { sidebar: { [key]: value || undefined } },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
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
            defaultValue: siteConfig?.syntaxMode,
            options: [
              { value: 'auto', label: 'Auto-detect' },
              { value: 'md', label: 'Markdown (md)' },
              { value: 'mdx', label: 'MDX (mdx)' },
            ],
          }}
          handleSubmit={updateDbConfig}
        />

        <Form
          title="Sidebar Order"
          description="How to order items in the file-tree sidebar."
          inputAttrs={{
            name: 'orderBy',
            type: 'select',
            defaultValue: siteConfig?.sidebar?.orderBy ?? 'path',
            options: [
              { value: 'path', label: 'Path (default)' },
              { value: 'title', label: 'Title' },
            ],
          }}
          handleSubmit={updateSidebarConfig}
        />

        <Form
          title="Show Table of Contents"
          description="Show a table of contents on pages that have headings."
          inputAttrs={{
            name: 'showToc',
            type: 'text',
            defaultValue: Boolean(siteConfig?.showToc).toString(),
          }}
          handleSubmit={updateDbConfig}
        />

        <Form
          title="Show Sidebar"
          description="Show the file-tree sidebar on your site."
          inputAttrs={{
            name: 'showSidebar',
            type: 'text',
            defaultValue: Boolean(siteConfig?.showSidebar).toString(),
          }}
          handleSubmit={updateDbConfig}
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
            defaultValue: Boolean(siteConfig?.enableRss).toString(),
          }}
          handleSubmit={updateDbConfig}
        />

        <Form
          title="Show Raw Markdown Link"
          description="Show a 'View raw markdown' link at the bottom of each page, linking to the raw Markdown source."
          inputAttrs={{
            name: 'showRawLink',
            type: 'text',
            defaultValue: Boolean(siteConfig?.showRawLink).toString(),
          }}
          handleSubmit={updateDbConfig}
        />

        <JsonForm
          title="Content Include"
          description="Glob patterns for paths to include in the site. Leave empty to include everything."
          helpText='Example: ["notes/","blog/"]'
          fieldName="contentInclude"
          defaultValue={siteConfig?.contentInclude ?? null}
          handleSubmit={updateContentInclude}
        />

        <JsonForm
          title="Content Exclude"
          description="Glob patterns for paths to exclude from the site entirely."
          helpText='Example: ["drafts/","private/"]'
          fieldName="contentExclude"
          defaultValue={siteConfig?.contentExclude ?? null}
          handleSubmit={updateContentExclude}
        />

        <JsonForm
          title="Content Hide"
          description="Glob patterns for paths to hide from navigation and search but still serve."
          helpText='Example: ["_assets/","_templates/"]'
          fieldName="contentHide"
          defaultValue={siteConfig?.contentHide ?? null}
          handleSubmit={updateContentHide}
        />

        <JsonForm
          title="Sidebar Paths"
          description="Limit the sidebar to specific subpaths. Leave empty to show all content."
          helpText='Example: ["docs/","guides/"]'
          fieldName="sidebar.paths"
          defaultValue={siteConfig?.sidebar?.paths ?? null}
          handleSubmit={updateSidebarPaths}
        />

        <JsonForm
          title="Redirects"
          description='URL redirects. Each entry needs "from" and "to" paths, and optionally "permanent" (true for 301, false for 302).'
          helpText='Example: [{"from":"/old-page","to":"/new-page","permanent":true}]'
          fieldName="redirects"
          defaultValue={siteConfig?.redirects ?? null}
          handleSubmit={updateRedirects}
        />
      </div>
    </div>
  );
}
