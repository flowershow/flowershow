import { ReactNode } from 'react';
import Footer from '@/components/public/footer';
import Nav from '@/components/public/nav';
import { SiteConfig } from '@/components/types';
import { getConfig } from '@/lib/app-config';
import { fetchFile } from '@/lib/content-store';
import { resolveSiteConfig } from '@/lib/site-config';
import '@/styles/default-theme.css';
import { env } from '@/env.mjs';
import { api } from '@/trpc/server';

export default async function HomeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const appConfig = getConfig();

  const flowershowWebsiteSite = await api.site.getByDomain.query({
    domain: env.NEXT_PUBLIC_HOME_DOMAIN,
  });

  // Source the nav/footer chrome from the live flowershow.app site's own
  // config.json so it stays in sync with the marketing site (single source of
  // truth) rather than being duplicated in this app's config.json.
  let siteConfig: SiteConfig = {};
  if (flowershowWebsiteSite) {
    try {
      const raw = await fetchFile({
        projectId: flowershowWebsiteSite.id,
        path: 'config.json',
      });
      if (raw) siteConfig = resolveSiteConfig(null, JSON.parse(raw));
    } catch {
      // missing or invalid config.json — render chrome without nav/footer links
    }
  }

  const logo = siteConfig.logo || appConfig.logo;
  const links = siteConfig.nav?.links;
  const cta = siteConfig.nav?.cta;
  const social = siteConfig.social;
  const footerNavigation = siteConfig.footer?.navigation;

  return (
    <div className="site-layout">
      <Nav
        logo={logo}
        url="/"
        title={appConfig.title}
        links={links}
        cta={cta}
        showThemeSwitch={false}
        showSearch={!!flowershowWebsiteSite}
        searchId={flowershowWebsiteSite?.id}
        social={social}
      />
      <div className="site-body">{children}</div>
      <Footer
        siteName={appConfig.title}
        navigation={footerNavigation}
        social={social}
      />
    </div>
  );
}
