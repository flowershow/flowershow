import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Billing from '@/components/dashboard/billing';
import Form from '@/components/dashboard/form';
import DeleteSiteForm from '@/components/dashboard/form/delete-site-form';
import GitHubConnectionForm from '@/components/dashboard/form/github-connection-form';
import ImageUploadForm from '@/components/dashboard/form/image-upload-form';
import RepoAccessLostForm from '@/components/dashboard/form/repo-access-lost-form';
import SitePasswordProtectionForm from '@/components/dashboard/form/site-password-form';
import JsonForm from '@/components/dashboard/json-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { validDomainRegex } from '@/lib/domains';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { getRepoFullName } from '@/lib/get-repo-full-name';
import { PLANS } from '@/lib/stripe-plans';
import type { SiteUpdateKey } from '@/server/api/types';
import { api } from '@/trpc/server';

export default async function SiteSettingsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const siteId = decodeURIComponent(params.id);

  const site = await api.site.getById.query({ id: siteId });
  if (!site) notFound();

  const [siteConfig, subscription] = await Promise.all([
    api.site.getDbConfig.query({ siteId: site.id }).catch(() => null),
    api.stripe.getSiteSubscription.query({ siteId: site.id }),
  ]);

  const repoFullName = getRepoFullName(site);
  const isRepoAccessLost = !site.installationRepository && !!site.ghRepository;
  let hasInstallationForRepo = false;
  if (isRepoAccessLost) {
    try {
      const installations = await api.github.listInstallations.query();
      hasInstallationForRepo = installations.some((installation) =>
        installation.repositories.some(
          (repo) => repo.repositoryFullName === site.ghRepository,
        ),
      );
    } catch {
      // ignore
    }
  }

  const themeConfig =
    typeof siteConfig?.theme === 'object' ? siteConfig.theme : undefined;

  // Server actions

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

  const updateGiscusConfig = async ({
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
      config: { giscus: { [key]: value || null } },
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
    await api.site.updateDbConfig.mutate({
      siteId: id,
      config: { umami: { src: value === '' ? null : value } },
    });
  };

  return (
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!repoFullName} />
      </div>

      <div className="col-span-10 flex flex-col space-y-12 sm:col-span-9 lg:col-span-10">
        {/* General */}
        <section id="general" className="scroll-mt-24 flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-800">General</h2>
          </div>
          <Form
            title="Name"
            description="The name of your site. Only visible by you."
            inputAttrs={{
              name: 'projectName',
              type: 'text',
              defaultValue: site.projectName,
              placeholder: 'site name',
              maxLength: 32,
              pattern: '^[a-zA-Z0-9_.-]+$',
            }}
            handleSubmit={updateSite}
            helpText="It can only consist of ASCII letters, digits, and characters ., -, and _. Maximum 32 characters can be used."
          />
          <Form
            title="Site Title"
            description="Your site name, appended as a suffix to every page title. Appears in browser tabs, search results, social shares, and bookmarks."
            helpText={
              <>
                Max 40 characters.{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/reference/seo-social-metadata"
                >
                  Learn more
                  <ExternalLinkIcon className="inline h-4" />
                </a>
              </>
            }
            inputAttrs={{
              name: 'title',
              type: 'text',
              defaultValue: siteConfig?.title ?? '',
              placeholder: 'My Awesome Site',
              maxLength: 40,
            }}
            handleSubmit={updateDbConfig}
          />
          <Form
            title="Description"
            description="Default description used in search results and social previews when a page has no description of its own."
            helpText={
              <>
                Max 500 characters.{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/reference/seo-social-metadata"
                >
                  Learn more
                  <ExternalLinkIcon className="inline h-4" />
                </a>
              </>
            }
            inputAttrs={{
              name: 'description',
              type: 'text',
              defaultValue: siteConfig?.description ?? '',
              placeholder: 'A site about...',
              maxLength: 500,
            }}
            handleSubmit={updateDbConfig}
          />
          <ImageUploadForm
            title="Favicon"
            description="Image shown as the browser tab icon. Upload a PNG, JPG, WebP, or SVG — or set an emoji via config.json."
            helpText={
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/custom-favicon"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
            }
            field="favicon"
            configKey="favicon"
            currentValue={siteConfig?.favicon ?? null}
            disabled={site.plan !== 'PREMIUM'}
          />
          <ImageUploadForm
            title="Social Image"
            description="Default image shown when sharing links on social media."
            helpText={
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/seo-social-metadata"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
            }
            field="image"
            configKey="image"
            currentValue={siteConfig?.image ?? null}
            disabled={site.plan !== 'PREMIUM'}
          />
        </section>

        <hr className="border-stone-200" />

        {/* Appearance */}
        <section
          id="appearance"
          className="scroll-mt-24 flex flex-col space-y-6"
        >
          <div>
            <h2 className="text-xl font-semibold text-stone-800">Appearance</h2>
          </div>
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
              <>
                Dark mode support varies by theme.{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/reference/dark-mode"
                >
                  Learn more
                  <ExternalLinkIcon className="inline h-4" />
                </a>
              </>
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
              <>
                Dark mode support varies by theme.{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/reference/dark-mode"
                >
                  Learn more
                  <ExternalLinkIcon className="inline h-4" />
                </a>
              </>
            }
            inputAttrs={{
              name: 'showModeSwitch',
              type: 'text',
              defaultValue: Boolean(themeConfig?.showModeSwitch).toString(),
            }}
            handleSubmit={updateThemeConfig}
          />
          <Form
            title="Flowershow Branding"
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
        </section>

        <hr className="border-stone-200" />

        {/* Navigation */}
        <section
          id="navigation"
          className="scroll-mt-24 flex flex-col space-y-6"
        >
          <div>
            <h2 className="text-xl font-semibold text-stone-800">Navigation</h2>
          </div>
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
            description="Navigation items shown in the header."
            helpText={
              <>
                {
                  "Each item needs 'name' and 'href'. Dropdowns use 'name' and 'links' (array of {name, href})."
                }{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/reference/navbar"
                >
                  Learn more
                  <ExternalLinkIcon className="inline h-4" />
                </a>
              </>
            }
            placeholder={'[{"name":"Blog","href":"/blog"}]'}
            fieldName="nav.links"
            defaultValue={siteConfig?.nav?.links ?? null}
            handleSubmit={updateNavLinks}
          />
          <JsonForm
            title="Social Links"
            description="Social platform links shown in the nav and footer."
            helpText={
              <>
                {
                  'Each item needs "name", "href", and optionally "label" (platform, e.g. "github", "twitter").'
                }{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/reference/navbar"
                >
                  Learn more
                  <ExternalLinkIcon className="inline h-4" />
                </a>
              </>
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
            description="Navigation groups in the footer."
            helpText={
              <>
                {
                  'Each group needs "title" and "links" (array of {name, href}).'
                }{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/reference/footer"
                >
                  Learn more
                  <ExternalLinkIcon className="inline h-4" />
                </a>
              </>
            }
            placeholder={
              '[{"title":"Docs","links":[{"name":"Getting Started","href":"/docs"}]}]'
            }
            fieldName="footer.navigation"
            defaultValue={siteConfig?.footer?.navigation ?? null}
            handleSubmit={updateFooterNavigation}
          />
        </section>

        <hr className="border-stone-200" />

        {/* Content */}
        <section id="content" className="scroll-mt-24 flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-800">Content</h2>
          </div>
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
            placeholder={'["authors/"]'}
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
        </section>

        <hr className="border-stone-200" />

        {/* Features */}
        <section id="features" className="scroll-mt-24 flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-800">Features</h2>
          </div>
          <Form
            title="Full-Text Search"
            description="Enable full-text search functionality for your site."
            helpText={
              <a
                className="underline"
                href="https://flowershow.app/blog/announcing-full-text-search"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
            }
            disabled={!isFeatureEnabled(Feature.Search, site)}
            inputAttrs={{
              name: 'enableSearch',
              type: 'text',
              defaultValue: isFeatureEnabled(Feature.Search, site)
                ? Boolean(siteConfig?.enableSearch).toString()
                : 'false',
            }}
            handleSubmit={updateDbConfig}
          />
          <Form
            title="RSS Feed"
            description="Enable an RSS feed for your site. Only pages with a date field in the frontmatter will be included."
            helpText={
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/rss-feed"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
            }
            inputAttrs={{
              name: 'enableRss',
              type: 'text',
              defaultValue: Boolean(siteConfig?.enableRss).toString(),
            }}
            handleSubmit={updateDbConfig}
          />
          <Form
            title="Comments"
            description="Show comments at the bottom of your site's pages. Individual pages can override this with showComments in their frontmatter."
            helpText={
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/comments"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
            }
            inputAttrs={{
              name: 'showComments',
              type: 'text',
              defaultValue: Boolean(siteConfig?.showComments).toString(),
            }}
            handleSubmit={updateDbConfig}
          />
          {siteConfig?.showComments && (
            <>
              <Form
                title="Giscus Repository ID"
                description="The ID of your GitHub repository for Giscus."
                helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your repository, the Repository ID will be shown in the configuration section. It starts with 'R_'."
                inputAttrs={{
                  name: 'repoId',
                  type: 'text',
                  defaultValue: siteConfig?.giscus?.repoId ?? '',
                  placeholder: 'R_kgDOxxxxxx',
                  required: false,
                }}
                handleSubmit={updateGiscusConfig}
              />
              <Form
                title="Giscus Category ID"
                description="The ID of the discussion category in your repository."
                helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your discussion category, the Category ID will be shown in the configuration section. It starts with 'DIC_'."
                inputAttrs={{
                  name: 'categoryId',
                  type: 'text',
                  defaultValue: siteConfig?.giscus?.categoryId ?? '',
                  placeholder: 'DIC_kwDOxxxxxx',
                  required: false,
                }}
                handleSubmit={updateGiscusConfig}
              />
            </>
          )}
          <Form
            title="Show Edit Link"
            description="Show a link at the bottom of each page for readers to edit the source on GitHub."
            disabled={!site.ghRepository}
            disabledLabel="Requires GitHub integration"
            helpText={
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/edit-this-page"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
            }
            inputAttrs={{
              name: 'showEditLink',
              type: 'text',
              defaultValue: site.ghRepository
                ? Boolean(siteConfig?.showEditLink).toString()
                : 'false',
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
        </section>

        <hr className="border-stone-200" />

        {/* Analytics */}
        <section
          id="analytics"
          className="scroll-mt-24 flex flex-col space-y-6"
        >
          <div>
            <h2 className="text-xl font-semibold text-stone-800">Analytics</h2>
          </div>
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
        </section>

        <hr className="border-stone-200" />

        {/* GitHub */}
        <section id="github" className="scroll-mt-24 flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-800">GitHub</h2>
          </div>
          {isRepoAccessLost && (
            <RepoAccessLostForm
              siteId={site.id}
              repositoryName={site.ghRepository ?? ''}
              hasInstallation={hasInstallationForRepo}
            />
          )}
          <GitHubConnectionForm
            siteId={site.id}
            ghRepository={repoFullName}
            ghBranch={site.ghBranch}
            rootDir={site.rootDir}
          />
        </section>

        <hr className="border-stone-200" />

        {/* Access & Domains */}
        <section id="access" className="scroll-mt-24 flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-800">
              Access &amp; Domains
            </h2>
          </div>
          <Form
            title="Custom Domain"
            description="The custom domain for your site."
            disabled={!isFeatureEnabled(Feature.CustomDomain, site)}
            helpText={
              <a
                className="underline"
                href="https://flowershow.app/docs/reference/custom-domain"
              >
                Learn more
                <ExternalLinkIcon className="inline h-4" />
              </a>
            }
            inputAttrs={{
              name: 'customDomain',
              type: 'text',
              defaultValue: isFeatureEnabled(Feature.CustomDomain, site)
                ? (site.customDomain ?? '')
                : '',
              placeholder: 'yourdomain.com',
              maxLength: 64,
              pattern: validDomainRegex.source,
            }}
            handleSubmit={updateSite}
          />
          <SitePasswordProtectionForm
            disabled={!isFeatureEnabled(Feature.PasswordProtection, site)}
            siteId={site.id}
          />
        </section>

        <hr className="border-stone-200" />

        {/* Billing */}
        <section id="billing" className="scroll-mt-24 flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-800">Billing</h2>
          </div>
          <Billing siteId={site.id} subscription={subscription} plans={PLANS} />
        </section>

        <hr className="border-stone-200" />

        {/* Danger Zone */}
        <section id="danger" className="scroll-mt-24 flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-red-700">Danger Zone</h2>
          </div>
          <DeleteSiteForm siteName={site.projectName} />
        </section>
      </div>
    </div>
  );
}
