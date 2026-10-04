import { GoogleAnalytics } from '@next/third-parties/google';
import clsx from 'clsx';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Script from 'next/script';
import { cache, type ReactNode } from 'react';
import BuiltWithFloatingButton from '@/components/public/built-with-floating-button';
import { CustomHead } from '@/components/public/custom-head';
import Footer from '@/components/public/footer';
import Nav from '@/components/public/nav';
import { SiteProvider } from '@/components/public/site-context';
import { TemporarySiteBanner } from '@/components/public/temporary-site-banner';
import { env } from '@/env.mjs';
import { getConfig } from '@/lib/app-config';
import {
  Feature,
  isFeatureEnabled,
  isSocialCardsEnabled,
} from '@/lib/feature-flags';
import { getSiteUrl } from '@/lib/get-site-url';
import {
  buildSocialMetadata,
  socialCardUrl,
  socialCardVersion,
  toCardInputs,
} from '@/lib/social-preview';
import type { SiteConfig } from '@/components/types';
import { loadProtectedCardSource } from '@/lib/protected-card-source';
import { getThemeUrl } from '@/lib/get-theme';
import { resolveSiteName } from '@/lib/site-config';
import { fontBody, fontBrand, fontHeading } from '@/styles/fonts-public';
import { TRPCReactProvider } from '@/trpc/react';
import { api } from '@/trpc/server';
import Providers from './_components/providers';
import '@/styles/prism.css';
import '@/styles/callouts.css';
import '@/styles/default-theme.css';
import { THEME_PREFERENCE_STORAGE_KEY } from '@/lib/const';
import type { SiteLookupResult } from '@/server/api/types';
import KatexStylesLoader from './_components/katex-loader';
import SiteLogoutButton from './_components/site-logout-button';

const { title: configTitle, description, favicon, thumbnail } = getConfig();
const title = configTitle ?? 'Flowershow';

/**
 * Site lookup shared by generateMetadata and the layout body: React cache()
 * dedupes it within a request, so the page costs one lookup, not two.
 */
const lookupSite = cache(
  async (
    username: string,
    projectName: string,
  ): Promise<SiteLookupResult | null> => {
    if (username === '_domain') {
      return api.site.getByDomain.query({ domain: projectName });
    }
    if (username === 'anon') {
      return api.site.getAnonymous.query({ projectName });
    }
    return api.site.get.query({ username, projectName });
  },
);

/** Pre-social-cards metadata, used when the flag is off (no lookups). */
const staticMetadata: Metadata = {
  title,
  description,
  icons: [favicon],
  openGraph: {
    title,
    description,
    type: 'website',
    url: `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    images: [{ url: thumbnail, width: 1200, height: 630, alt: 'Thumbnail' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [{ url: thumbnail, width: 1200, height: 630, alt: 'Thumbnail' }],
  },
};

export async function generateMetadata(props: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  if (!isSocialCardsEnabled()) return staticMetadata;
  const params = await props.params;
  const base: Metadata = { title, description, icons: [favicon] };
  const fallbackImage = { url: thumbnail, width: 1200, height: 630 };

  const site = await lookupSite(
    decodeURIComponent(params.user),
    decodeURIComponent(params.project),
  ).catch(() => null);
  if (!site) {
    return {
      ...base,
      ...buildSocialMetadata({
        title,
        description,
        url: `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}`,
        image: fallbackImage,
      }),
    };
  }

  const siteUrl = getSiteUrl(site);
  // Same inputs as the /_og route: protected sites use DB config only
  // (tRPC getConfig would throw without the visitor cookie).
  let cardSite = site;
  let siteConfig: SiteConfig | null;
  if (site.privacyMode === 'PASSWORD') {
    const { plan, dbConfig } = await loadProtectedCardSource(site.id);
    cardSite = { ...site, plan: plan ?? undefined };
    siteConfig = dbConfig;
  } else {
    siteConfig = await api.site.getConfig
      .query({ siteId: site.id })
      .catch(() => null);
  }
  const inputs = toCardInputs({ site: cardSite, siteConfig, blob: null });
  const image = {
    url: socialCardUrl(siteUrl, '/', socialCardVersion(inputs)),
    width: 1200,
    height: 630,
  };
  return {
    ...base,
    ...buildSocialMetadata({ title, description, url: `${siteUrl}/`, image }),
  };
}

interface RouteParams {
  user: string;
  project: string;
}

export default async function PublicLayout(props: {
  params: Promise<RouteParams>;
  children: ReactNode;
}) {
  const params = await props.params;

  const { children } = props;

  const username = decodeURIComponent(params.user); // user's github username or "_domain" if on custom domain (see middleware)
  const projectName = decodeURIComponent(params.project);

  const site = await lookupSite(username, projectName);

  if (!site) {
    notFound();
  }

  // Redirect to custom domain if it exists
  if (username !== '_domain' && username !== 'anon' && site.customDomain) {
    return redirect(`https://${site.customDomain}`);
  }

  const sitePrefix = '';
  const appConfig = getConfig();

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  const customCss = await api.site.getCustomStyles
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  const usesGoogleFonts = customCss
    ? /fonts\.googleapis\.com/i.test(customCss)
    : false;

  // Theme from official Flowershow Themes collection
  const themeName =
    typeof siteConfig?.theme === 'string' // backward compatibility for theme of type string
      ? siteConfig.theme
      : siteConfig?.theme?.theme;
  const themeUrl = themeName ? getThemeUrl(themeName) : null;
  // Light/Dark
  let showThemeModeSwitch = false;
  let defaultMode = 'light';

  if (typeof siteConfig?.theme !== 'string') {
    showThemeModeSwitch = siteConfig?.theme?.showModeSwitch ?? false;

    if (
      siteConfig?.theme?.defaultMode &&
      ['light', 'dark', 'system'].includes(siteConfig?.theme?.defaultMode)
    ) {
      defaultMode = siteConfig?.theme?.defaultMode;
    }
  }

  const userLogo = siteConfig?.logo ?? siteConfig?.nav?.logo;
  const logo = userLogo ?? appConfig.logo;
  const siteName = resolveSiteName(siteConfig, site.projectName);
  const navTitle = siteConfig?.nav?.title ?? (userLogo ? undefined : siteName);
  const links = siteConfig?.nav?.links;
  const social = siteConfig?.social || siteConfig?.nav?.social;
  const canHideBuiltWith = isFeatureEnabled(Feature.NoBranding, site);
  const showBuiltWithButton =
    !canHideBuiltWith || !!siteConfig?.showBuiltWithButton;
  const showSearch =
    isFeatureEnabled(Feature.Search, site) && !!siteConfig?.enableSearch;
  const cta = siteConfig?.nav?.cta;
  const showNav =
    !!siteConfig?.nav || !!siteConfig?.enableSearch || !!siteConfig?.social;

  return (
    <html
      className={clsx(
        fontBody.variable,
        fontHeading.variable,
        fontBrand.variable,
      )}
      lang="en"
      suppressHydrationWarning
      data-theme={defaultMode}
    >
      <head>
        {usesGoogleFonts && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
              rel="preconnect"
              href="https://fonts.gstatic.com"
              crossOrigin="anonymous"
            ></link>
          </>
        )}
        {themeUrl && <link rel="stylesheet" href={themeUrl} />}
        {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
        {showThemeModeSwitch && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
(function () {
  // Adjust data-theme attribute based on stored theme preference
  try {
    var t = localStorage.getItem('${THEME_PREFERENCE_STORAGE_KEY}');
    if (t) {
      if (t === 'system') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var el = document.documentElement;
      el.classList.add('disable-theme-transitions');
      if (el.getAttribute('data-theme') !== t) el.setAttribute('data-theme', t);
      setTimeout(function(){ el.classList.remove('disable-theme-transitions'); }, 0);
    } 
  } catch(_) {}
})();`,
            }}
          />
        )}
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
            integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
            crossOrigin="anonymous"
          />
        </noscript>
        {siteConfig?.umami && (
          <Script
            defer
            src={siteConfig.umami.src ?? 'https://cloud.umami.is/script.js'}
            data-website-id={siteConfig.umami.websiteId}
          />
        )}
        {/* User-configured custom head HTML — Premium-only, rendered on the public site only. */}
        {isFeatureEnabled(Feature.CustomHead, site) && siteConfig?.head && (
          <CustomHead html={siteConfig.head} />
        )}
      </head>
      <body>
        {siteConfig?.analytics && (
          <GoogleAnalytics gaId={siteConfig.analytics} />
        )}
        <TRPCReactProvider headers={await headers()}>
          <Providers>
            <SiteProvider
              value={{
                user: params.user,
                project: params.project,
                prefix: sitePrefix,
                contentHide: siteConfig?.contentHide?.map((p) =>
                  p.startsWith('/') ? p : `/${p}`,
                ),
              }}
            >
              {/* TODO hacky, temp; move data-plan to root level layout (create separate one for user sites)
          and don't decide based on that button */}
              <div
                data-plan={!showBuiltWithButton && 'premium'}
                className={clsx('site-layout', !showNav && 'no-nav')}
              >
                {site.isTemporary && site.anonymousOwnerId && (
                  <TemporarySiteBanner
                    siteId={site.id}
                    expiresAt={site.expiresAt ?? null}
                    anonymousOwnerId={site.anonymousOwnerId}
                  />
                )}
                {showNav && (
                  <Nav
                    logo={logo}
                    url={sitePrefix || '/'}
                    title={navTitle}
                    links={links}
                    social={social}
                    showSearch={showSearch}
                    searchId={site.id}
                    showThemeSwitch={showThemeModeSwitch}
                    cta={cta}
                  />
                )}
                <div className="site-body">{children}</div>
                <Footer
                  siteName={siteName}
                  social={social}
                  navigation={siteConfig?.footer?.navigation}
                />
                {showBuiltWithButton && <BuiltWithFloatingButton />}
                {site.privacyMode === 'PASSWORD' && (
                  <SiteLogoutButton
                    siteId={site.id}
                    sitename={site.projectName}
                  />
                )}
              </div>
            </SiteProvider>
          </Providers>
        </TRPCReactProvider>
        <KatexStylesLoader />
      </body>
    </html>
  );
}
