import { ReactNode } from 'react';
import Footer from '@/components/public/footer';
import Nav from '@/components/public/nav';
import { getConfig } from '@/lib/app-config';
import '@/styles/default-theme.css';
import { env } from '@/env.mjs';
import { api } from '@/trpc/server';

export default async function HomeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const appConfig = getConfig();

  const logo = appConfig.nav?.logo || appConfig.logo;
  const links = appConfig.nav?.links;
  const cta = appConfig.nav?.cta;
  const social = appConfig.social;
  const footerNavigation = appConfig.footer?.navigation;

  const flowershowWebsiteSite = await api.site.getByDomain.query({
    domain: env.NEXT_PUBLIC_HOME_DOMAIN,
  });

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
