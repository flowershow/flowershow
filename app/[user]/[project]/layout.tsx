import { GoogleAnalytics } from "@next/third-parties/google";
import { ReactNode } from "react";

import { api } from "@/trpc/server";

import { getConfig } from "@/lib/app-config";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { resolveLinkToUrl } from "@/lib/resolve-link";
import { getThemeUrl } from "@/lib/get-theme";
import { getSite } from "@/lib/get-site";

import BuiltWithFloatingButton from "@/components/public/built-with-floating-button";
import Footer from "@/components/public/footer";
import Nav, { type Props as NavProps } from "@/components/public/nav";
import { SiteProvider } from "@/components/public/site-context";
import { getSiteUrlPath } from "@/lib/get-site-url";

interface RouteParams {
  user: string;
  project: string;
}

export default async function Layout({
  params,
  children,
}: {
  params: RouteParams;
  children: ReactNode;
}) {
  const projectName = decodeURIComponent(params.project);
  const userName = decodeURIComponent(params.user); // user's github username or "_domain" if on custom domain (see middleware)

  const appConfig = getConfig();
  const site = await getSite(userName, projectName);
  const sitePrefix = getSiteUrlPath(site);

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

  const theme = siteConfig?.theme ? getThemeUrl(siteConfig.theme) : null;

  let siteTree;

  if (siteConfig?.showSidebar) {
    siteTree = await api.site.getSiteTree
      .query({
        siteId: site.id,
        orderBy: siteConfig?.sidebar?.orderBy,
      })
      .catch(() => []);
  }

  const logo = resolveLinkToUrl({
    target: siteConfig?.nav?.logo ?? siteConfig?.logo ?? appConfig.logo, // default to Flowershow logo
    prefix: sitePrefix,
    isSrcLink: true,
    domain: site.customDomain,
  });

  const title = siteConfig?.nav?.title;

  const links = siteConfig?.nav?.links?.map((link) => ({
    ...link,
    href: resolveLinkToUrl({
      target: link.href,
      prefix: sitePrefix,
    }),
  }));

  const social = siteConfig?.nav?.social?.map((link) => ({
    ...link,
    href: resolveLinkToUrl({
      target: link.href,
      prefix: sitePrefix,
    }),
  }));

  const showBuiltWithButton = !isFeatureEnabled(Feature.NoBranding, site);
  const showSearch =
    isFeatureEnabled(Feature.Search, site) && site.enableSearch;

  return (
    <>
      {/* it should be in the head */}
      {theme && <link rel="stylesheet" href={theme} />}
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {siteConfig?.analytics && <GoogleAnalytics gaId={siteConfig.analytics} />}

      <SiteProvider
        value={{
          user: params.user,
          project: params.project,
          prefix: sitePrefix,
        }}
      >
        <div className="site-layout">
          <Nav
            logo={logo}
            url={sitePrefix ?? "/"}
            title={title}
            links={links}
            social={social}
            siteTree={siteTree}
            showSearch={showSearch}
            searchId={site.id}
          />
          <div className="site-body">{children}</div>
          <Footer />
          {showBuiltWithButton && <BuiltWithFloatingButton />}
        </div>
      </SiteProvider>
    </>
  );
}
