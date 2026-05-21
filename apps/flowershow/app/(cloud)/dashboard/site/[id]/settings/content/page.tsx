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

  const updateSidebarPaths = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { sidebar: { paths: value as never } },
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

  const updateRedirects = async (id: string, value: unknown) => {
    'use server';
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { redirects: value as never },
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
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/syntax-mode"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          inputAttrs={{
            name: 'syntaxMode',
            type: 'select',
            defaultValue: siteConfig?.syntaxMode ?? 'auto',
            options: [
              { value: 'auto', label: 'Auto-detect' },
              { value: 'md', label: 'Markdown (md)' },
              { value: 'mdx', label: 'MDX (mdx)' },
            ],
          }}
          handleSubmit={updateDbConfig}
        />

        <Form
          title="Show Sidebar"
          description="Show the file-tree sidebar on your site."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/sidebar"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          inputAttrs={{
            name: 'showSidebar',
            type: 'text',
            defaultValue: Boolean(siteConfig?.showSidebar).toString(),
          }}
          handleSubmit={updateDbConfig}
        />

        <Form
          title="Sidebar Order"
          description="How to order items in the file-tree sidebar."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/sidebar"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
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

        <JsonForm
          title="Sidebar Paths"
          description="Limit the sidebar to specific subpaths. Leave empty to show all content."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/sidebar"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          placeholder={'["docs/","guides/"]'}
          fieldName="sidebar.paths"
          defaultValue={siteConfig?.sidebar?.paths ?? null}
          handleSubmit={updateSidebarPaths}
        />

        <Form
          title="Show Table of Contents"
          description="Show a table of contents on pages that have headings."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/table-of-contents"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          inputAttrs={{
            name: 'showToc',
            type: 'text',
            defaultValue: Boolean(siteConfig?.showToc).toString(),
          }}
          handleSubmit={updateDbConfig}
        />

        <JsonForm
          title="Content Include"
          description="Paths to include in the site (e.g. directories or specific files). Leave empty to include everything."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/content-filtering"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          placeholder={'["notes/","blog/"]'}
          fieldName="contentInclude"
          defaultValue={siteConfig?.contentInclude ?? null}
          handleSubmit={updateContentInclude}
        />

        <JsonForm
          title="Content Exclude"
          description="Paths to exclude from the site entirely (directories or specific files). Exclude rules take precedence over include rules."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/content-filtering"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          placeholder={'["drafts/","private/"]'}
          fieldName="contentExclude"
          defaultValue={siteConfig?.contentExclude ?? null}
          handleSubmit={updateContentExclude}
        />

        <JsonForm
          title="Content Hide"
          description="Paths to hide from sidebar and search, but still published and accessible by URL."
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/content-filtering"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          placeholder={'["/authors"]'}
          fieldName="contentHide"
          defaultValue={siteConfig?.contentHide ?? null}
          handleSubmit={updateContentHide}
        />

        <JsonForm
          title="Redirects"
          description='URL redirects. Each entry needs "from" and "to" paths, and optionally "permanent" (true for 301, false for 302).'
          helpText={
            <a
              className="underline"
              href="https://flowershow.app/docs/reference/redirects"
            >
              Learn more
              <ExternalLinkIcon className="inline h-4" />
            </a>
          }
          placeholder={
            '[{"from":"/old-page","to":"/new-page","permanent":true}]'
          }
          fieldName="redirects"
          defaultValue={siteConfig?.redirects ?? null}
          handleSubmit={updateRedirects}
        />
      </div>
    </div>
  );
}
