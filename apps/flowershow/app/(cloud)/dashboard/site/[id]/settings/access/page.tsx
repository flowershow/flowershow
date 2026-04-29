import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import Form from '@/components/dashboard/form';
import SitePasswordProtectionForm from '@/components/dashboard/form/site-password-form';
import SettingsNav from '@/components/dashboard/settings-nav';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { validDomainRegex } from '@/lib/domains';
import type { SiteUpdateKey } from '@/server/api/types';
import { api } from '@/trpc/server';

export default async function AccessSettingsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) notFound();

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
    <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
      <div className="sticky top-[5rem] col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
        <SettingsNav hasGhRepository={!!site.ghRepository} />
      </div>
      <div className="col-span-10 flex flex-col space-y-6 sm:col-span-9 lg:col-span-10">
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
              ? (site.customDomain ?? '')
              : '',
            placeholder: 'yourdomain.com',
            maxLength: 64,
            pattern: validDomainRegex.toString(),
          }}
          handleSubmit={updateSite}
        />

        <SitePasswordProtectionForm
          disabled={!isFeatureEnabled(Feature.PasswordProtection, site)}
          siteId={site.id}
        />
      </div>
    </div>
  );
}
