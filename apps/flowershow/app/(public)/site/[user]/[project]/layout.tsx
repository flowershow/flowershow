import { GoogleAnalytics } from '@next/third-parties/google';
import clsx from 'clsx';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Script from 'next/script';
import type { ReactNode } from 'react';
import BuiltWithFloatingButton from '@/components/public/built-with-floating-button';
import Footer from '@/components/public/footer';
import Nav from '@/components/public/nav';
import { SiteProvider } from '@/components/public/site-context';
import { TemporarySiteBanner } from '@/components/public/temporary-site-banner';
import { env } from '@/env.mjs';
import { getConfig } from '@/lib/app-config';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { getSiteUrlPath } from '@/lib/get-site-url';
import { getThemeUrl } from '@/lib/get-theme';
import { fontBody, fontBrand, fontHeading } from '@/styles/fonts-public';
import { TRPCReactProvider } from '@/trpc/react';
import { api } from '@/trpc/server';
import Providers from './_components/providers';
import '@/styles/prism.css';
import '@/styles/callouts.css';
import '@/styles/default-theme.css';
import { THEME_PREFERENCE_STORAGE_KEY } from '@/lib/const';
import type { PublicSite } from '@/server/api/types';
import KatexStylesLoader from './_components/katex-loader';
import SiteLogoutButton from './_components/site-logout-button';

const { title, description, favicon, thumbnail } = getConfig();

export const metadata: Metadata = {
  title,
  description,
  icons: [favicon],
  openGraph: {
    title,
    description,
    type: 'website',
    url: `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    images: [
      {
        url: thumbnail,
        width: 1200,
        height: 630,
        alt: 'Thumbnail',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [
      {
        url: thumbnail,
        width: 1200,
        height: 630,
        alt: 'Thumbnail',
      },
    ],
    creator: '@flowershowapp',
  },
};

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

  let site: PublicSite | null;
  if (username === '_domain') {
    site = await api.site.getByDomain.query({
      domain: projectName,
    });
  } else if (username === 'anon') {
    site = await api.site.getAnonymous.query({
      projectName,
    });
  } else {
    site = await api.site.get.query({
      username,
      projectName,
    });
  }

  if (!site) {
    notFound();
  }

  // Redirect to custom domain if it exists
  if (username !== '_domain' && username !== 'anon' && site.customDomain) {
    return redirect(`https://${site.customDomain}`);
  }

  const sitePrefix = getSiteUrlPath(site);
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

  const logo = siteConfig?.nav?.logo ?? siteConfig?.logo ?? appConfig.logo; // default to Flowershow logo
  const title = siteConfig?.nav?.title;
  const links = siteConfig?.nav?.links;
  const social = siteConfig?.social || siteConfig?.nav?.social;
  const showBuiltWithButton = !isFeatureEnabled(Feature.NoBranding, site);
  const showSearch =
    isFeatureEnabled(Feature.Search, site) && site.enableSearch;
  const cta = siteConfig?.nav?.cta;
  const showNav = !!siteConfig?.nav || site.enableSearch || siteConfig?.social;

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
            src={
              typeof siteConfig.umami === 'string'
                ? 'https://cloud.umami.is/script.js'
                : (siteConfig.umami.src ?? 'https://cloud.umami.is/script.js')
            }
            data-website-id={
              typeof siteConfig.umami === 'string'
                ? siteConfig.umami
                : siteConfig.umami.websiteId
            }
          />
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
                    expiresAt={site.expiresAt}
                    anonymousOwnerId={site.anonymousOwnerId}
                  />
                )}
                {showNav && (
                  <Nav
                    logo={logo}
                    url={sitePrefix || '/'}
                    title={title}
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
                  siteName={siteConfig?.title || site.projectName}
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
