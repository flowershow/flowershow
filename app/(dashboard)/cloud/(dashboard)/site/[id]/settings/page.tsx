import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Billing from '@/components/dashboard/billing';
import Form from '@/components/dashboard/form';
import DeleteSiteForm from '@/components/dashboard/form/delete-site-form';
import MigrateToGitHubAppForm from '@/components/dashboard/form/migrate-to-github-app-form';
import SitePasswordProtectionForm from '@/components/dashboard/form/site-password-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { validDomainRegex } from '@/lib/domains';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { PLANS } from '@/lib/stripe-plans';
import { SiteUpdateKey } from '@/server/api/types';
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

  const subscription = await api.stripe.getSiteSubscription.query({
    siteId: site.id,
  });

  // Check if site needs migration (OAuth-only, no GitHub App installation)
  const isOAuthSite =
    !site.installationId && site.ghRepository !== 'cli-upload';
  let hasInstallationForRepo = false;

  if (isOAuthSite) {
    try {
      const installations = await api.github.listInstallations.query();
      // Check if any installation has access to this site's repository
      hasInstallationForRepo = installations.some((installation) =>
        installation.repositories.some(
          (repo) => repo.repositoryFullName === site.ghRepository,
        ),
      );
    } catch (error) {
      // If installations can't be fetched, assume no installation
      console.error('Failed to fetch installations:', error);
    }
  }

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
  return (
    <>
      <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
        <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
          <SettingsNav />
        </div>
        <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
          {isOAuthSite && (
            <MigrateToGitHubAppForm
              siteId={site.id}
              repositoryName={site.ghRepository}
              hasInstallation={hasInstallationForRepo}
            />
          )}

          <Form
            title="Name"
            description="The name of your site. It can only consist of ASCII letters, digits, and characters ., -, and _. Maximum 32 characters can be used."
            inputAttrs={{
              name: 'projectName',
              type: 'text',
              defaultValue: site?.projectName!,
              placeholder: 'site name',
              maxLength: 32,
              pattern: '^[a-zA-Z0-9_.-]+$',
            }}
            handleSubmit={updateSite}
          />

          <Form
            title="Root Directory"
            description="The directory within your repository, in which your content is located. Leave empty if you're publishing the whole repository."
            helpText={
              <p>
                Learn more about{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/site-settings#root-directory"
                >
                  Root directory
                  <ExternalLinkIcon className="inline h-4" />
                </a>
                .
              </p>
            }
            inputAttrs={{
              name: 'rootDir',
              type: 'text',
              defaultValue: site?.rootDir!,
              required: false,
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
              defaultValue: site?.syntaxMode!,
              options: [
                { value: 'auto', label: 'Auto-detect' },
                { value: 'md', label: 'Markdown (md)' },
                { value: 'mdx', label: 'MDX (mdx)' },
              ],
            }}
            handleSubmit={updateSite}
          />

          <Form
            title="Auto-sync"
            description="Automatically sync your site after each change to the GitHub repository."
            helpText={
              <p>
                Learn more about{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/site-settings#auto-sync"
                >
                  Auto-Sync
                  <ExternalLinkIcon className="inline h-4" />
                </a>
                .
              </p>
            }
            inputAttrs={{
              name: 'autoSync',
              type: 'text',
              defaultValue: Boolean(site?.autoSync!).toString(),
            }}
            handleSubmit={updateSite}
          />

          <Form
            title="Comments"
            description="Enable comments at the bottom of your site's pages."
            helpText={
              <p>
                Learn more about{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/comments"
                >
                  Comments
                  <ExternalLinkIcon className="inline h-4" />
                </a>
                .
              </p>
            }
            inputAttrs={{
              name: 'enableComments',
              type: 'text',
              defaultValue: Boolean(site?.enableComments!).toString(),
            }}
            handleSubmit={updateSite}
          />

          {site?.enableComments && (
            <>
              <Form
                title="Giscus Repository ID"
                description="The ID of your GitHub repository for Giscus."
                helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your repository, the Repository ID will be shown in the configuration section. It starts with 'R_'."
                inputAttrs={{
                  name: 'giscusRepoId',
                  type: 'text',
                  defaultValue: site?.giscusRepoId || '',
                  placeholder: 'R_kgDOxxxxxx',
                  required: false,
                }}
                handleSubmit={updateSite}
              />

              <Form
                title="Giscus Category ID"
                description="The ID of the discussion category in your repository."
                helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your discussion category, the Category ID will be shown in the configuration section. It starts with 'DIC_'."
                inputAttrs={{
                  name: 'giscusCategoryId',
                  type: 'text',
                  defaultValue: site?.giscusCategoryId || '',
                  placeholder: 'DIC_kwDOxxxxxx',
                  required: false,
                }}
                handleSubmit={updateSite}
              />
            </>
          )}

          <Form
            title="Custom Domain"
            description="The custom domain for your site."
            disabled={!isFeatureEnabled(Feature.CustomDomain, site)}
            helpText={
              <p>
                Learn more about{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/docs/site-settings#custom-domain-%EF%B8%8F-premium-feature"
                >
                  Custom domain
                  <ExternalLinkIcon className="inline h-4" />
                </a>
                .
              </p>
            }
            inputAttrs={{
              name: 'customDomain',
              type: 'text',
              defaultValue: isFeatureEnabled(Feature.CustomDomain, site)
                ? site?.customDomain!
                : '',
              placeholder: 'yourdomain.com',
              maxLength: 64,
              pattern: validDomainRegex.toString(),
            }}
            handleSubmit={updateSite}
          />

          <Form
            title="Full-Text Search"
            description="Enable full-text search functionality for your site."
            helpText={
              <p>
                Learn more about{' '}
                <a
                  className="underline"
                  href="https://flowershow.app/blog/announcing-full-text-search"
                >
                  Full-text search
                  <ExternalLinkIcon className="inline h-4" />
                </a>
                .
              </p>
            }
            disabled={!isFeatureEnabled(Feature.Search, site)}
            inputAttrs={{
              name: 'enableSearch',
              type: 'text',
              defaultValue: isFeatureEnabled(Feature.Search, site)
                ? Boolean(site?.enableSearch).toString()
                : 'false',
            }}
            handleSubmit={updateSite}
          />

          <SitePasswordProtectionForm
            disabled={!isFeatureEnabled(Feature.PasswordProtection, site)}
            siteId={site.id}
          />

          <Billing siteId={site.id} subscription={subscription} plans={PLANS} />

          <DeleteSiteForm siteName={site?.projectName!} />
        </div>
      </div>
    </>
  );
}
