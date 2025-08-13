import { GoogleAnalytics } from "@next/third-parties/google";
import { ReactNode } from "react";

import { api } from "@/trpc/server";
import { env } from "@/env.mjs";

import { getConfig } from "@/lib/app-config";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { resolveLink } from "@/lib/resolve-link";
import { isInternalSite } from "@/lib/resolve-site-alias";
import { getThemeUrl } from "@/lib/get-theme";
import { getSite } from "@/lib/get-site";

import BuiltWithFloatingButton from "@/components/public/built-with-floating-button";
import Footer from "@/components/public/footer";
import Nav, { type Props as NavProps } from "@/components/public/nav";

import type { SiteConfig } from "@/components/types";
import type { SiteWithUser } from "@/types";

const config = getConfig();

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
  const userName = decodeURIComponent(params.user); // user's github username or "_domain" (see middleware)

  const site = await getSite(userName, projectName);

  const customCss = await api.site.getCustomStyles
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  const siteConfig = await api.site.getConfig
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
      })
      .catch(() => []);
  }

  const { title, logo, url, links, social } = getNavConfig({
    site,
    siteConfig,
  });

  const showBuiltWithButton = !isFeatureEnabled(Feature.NoBranding, site);
  const showSearch =
    isFeatureEnabled(Feature.Search, site) && site.enableSearch;

  const searchResultPrefix = site.customDomain
    ? "/"
    : `/@${site.user!.ghUsername}/${site.projectName}/`;

  return (
    <>
      {/* it should be in the head */}
      {theme && <link rel="stylesheet" href={theme} />}
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {siteConfig?.analytics && <GoogleAnalytics gaId={siteConfig.analytics} />}

      <div className="site-layout">
        <Nav
          logo={logo}
          url={url}
          title={title}
          links={links}
          social={social}
          siteTree={siteTree}
          showSearch={showSearch}
          searchId={site.id}
          searchPrefix={searchResultPrefix}
        />
        <div className="site-body">{children}</div>
        <Footer />
        {showBuiltWithButton && <BuiltWithFloatingButton />}
      </div>
    </>
  );
}

function getNavConfig({
  site,
  siteConfig,
}: {
  site: SiteWithUser;
  siteConfig: SiteConfig | null;
}): Omit<NavProps, "siteId" | "site"> {
  const navConfig: Omit<NavProps, "siteId" | "site"> = {
    logo: config.logo,
  };

  if (isInternalSite(site)) {
    navConfig.url = "/";
    navConfig.title = (config.nav as any).title; // TODO fix type
    navConfig.links = config.nav.links;
    navConfig.social = config.nav.social;
    // navConfig.cta = config.nav.cta;
  } else {
    const customLogo = siteConfig?.nav?.logo ?? siteConfig?.logo;
    if (customLogo) {
      const protocol =
        process.env.NODE_ENV === "development" ? "http://" : "https://";
      navConfig.logo = resolveLink({
        link: customLogo,
        filePath: "config.json",
        prefixPath: `${protocol}${env.NEXT_PUBLIC_S3_BUCKET_DOMAIN}/${site.id}/${site.ghBranch}/raw`,
      });
    }

    navConfig.url = site.customDomain
      ? `https://${site.customDomain}`
      : `/@${site.user!.ghUsername}/${site.projectName}`;

    navConfig.title = siteConfig?.nav?.title;

    if (siteConfig?.nav?.links) {
      navConfig.links = siteConfig?.nav?.links.map((link: any) => ({
        ...link,
        href: resolveLink({
          link: link.href,
          filePath: "config.json",
          prefixPath: site.customDomain
            ? ""
            : `/@${site.user?.ghUsername}/${site.projectName}`,
        }),
      }));
    }

    if (siteConfig?.nav?.social) {
      navConfig.social = siteConfig?.nav?.social.map((link: any) => ({
        ...link,
        href: resolveLink({
          link: link.href,
          filePath: "config.json",
          prefixPath: site.customDomain
            ? ""
            : `/@${site.user?.ghUsername}/${site.projectName}`,
        }),
      }));
    }
  }

  return navConfig;
}
