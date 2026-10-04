import clsx from 'clsx';
import { jwtVerify } from 'jose';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { env } from '@/env.mjs';
import { getConfig } from '@/lib/app-config';
import { isSocialCardsEnabled } from '@/lib/feature-flags';
import {
  buildSocialMetadata,
  socialCardUrl,
  socialCardVersion,
  toCardInputs,
} from '@/lib/social-preview';
import { loadProtectedCardSource } from '@/lib/protected-card-source';
import { SITE_ACCESS_COOKIE_NAME } from '@/lib/const';
import { internalGetSiteById } from '@/lib/db/internal';
import { getSite } from '@/lib/get-site';
import { getSiteUrl } from '@/lib/get-site-url';
import { isEmoji } from '@/lib/is-emoji';
import { resolveContentLink } from '@/lib/resolve-link';
import { siteKeyBytes } from '@/lib/site-hmac-key';
import {
  fontBrand,
  fontDashboardBody,
  fontDashboardHeading,
} from '@/styles/fonts-dashboard';
import { api } from '@/trpc/server';
import { SiteLoginForm } from './_components/site-login-form';

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
}

export async function generateMetadata(props: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  // Cards off: the pre-cards static metadata, no lookups.
  if (!isSocialCardsEnabled()) return { title: 'Site authentication' };
  const params = await props.params;
  const site = await getSite(
    decodeURIComponent(params.user),
    decodeURIComponent(params.project),
  );
  // Mirrors the /_og route's protected path: DB config + plan, no blob.
  const { plan, dbConfig } = await loadProtectedCardSource(site.id);
  const inputs = toCardInputs({
    site: { ...site, plan },
    siteConfig: dbConfig,
    blob: null,
  });
  const siteUrl = getSiteUrl(site);
  const image = {
    url: socialCardUrl(siteUrl, '/', socialCardVersion(inputs)),
    width: 1200,
    height: 630,
  };
  return {
    title: 'Site authentication',
    ...buildSocialMetadata({
      title: inputs.siteName,
      description: inputs.siteDescription ?? undefined,
      url: `${siteUrl}/`,
      image,
    }),
  };
}

export default async function LoginPage(props: {
  params: Promise<RouteParams>;
}) {
  const params = await props.params;
  const userName = decodeURIComponent(params.user); // user's github username or "_domain" if on custom domain (see middleware)
  const projectName = decodeURIComponent(params.project);

  const site = await getSite(userName, projectName);

  if (site.privacyMode === 'PUBLIC') {
    // TODO redirect to returnTo
    redirect(getSiteUrl(site));
  }

  const cookie = (await cookies()).get(SITE_ACCESS_COOKIE_NAME(site.id));

  if (cookie?.value) {
    try {
      const _site = await internalGetSiteById(site.id); // TODO should be a better way
      if (!_site) {
        notFound();
      }
      const secret = await siteKeyBytes(_site.id, _site.tokenVersion);

      await jwtVerify(cookie.value, secret, { audience: site.id });
      // TODO redirect to returnTo
      redirect(getSiteUrl(site));
    } catch (_) {
      console.log('Not authenticated');
      // display the form
    }
  }

  const siteBranding = await api.site.getSiteBranding
    .query({
      siteId: site.id,
    })
    .catch(() => null);
  const siteHostname =
    site.customDomain ?? `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

  const logo = siteBranding?.logo ?? config.logo;
  // Use the raw API endpoint instead of the site URL so _next/image can fetch the
  // logo server-side without hitting the password gate on the site domain.
  const resolvedLogo =
    logo && !logo.startsWith('http') && !isEmoji(logo)
      ? `https://${siteHostname}/api/raw/${userName}/${projectName}/${logo.replace(/^\//, '')}`
      : logo;

  return (
    <div
      className={clsx(
        'mx-5 border border-primary-faint p-10 text-center sm:mx-auto sm:w-full sm:max-w-md sm:rounded-lg sm:shadow-md md:max-w-lg md:p-12',
        fontDashboardBody.variable,
        fontDashboardHeading.variable,
        fontBrand.variable,
      )}
    >
      {logo && isEmoji(logo) ? (
        <span className="text-6xl" aria-label="Logo" role="img">
          {logo}
        </span>
      ) : (
        <Image
          alt="Logo"
          width={100}
          height={100}
          className="relative mx-auto h-12 w-auto"
          src={resolvedLogo}
        />
      )}
      <h1 className="mt-6 text-center font-dashboard-heading text-3xl">
        Authentication required
      </h1>

      <div className="mt-8">
        <SiteLoginForm siteId={site.id} />
      </div>
    </div>
  );
}
