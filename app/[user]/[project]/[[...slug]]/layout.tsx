import { notFound, permanentRedirect, redirect } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ReactNode } from "react";
import clsx from "clsx";

import { Blob } from "@prisma/client";
import { PageMetadata } from "@/server/api/types";
import { api } from "@/trpc/server";
import { env } from "@/env.mjs";

import { getConfig } from "@/lib/app-config";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { resolveLink } from "@/lib/resolve-link";
import { isInternalSite, resolveSiteAlias } from "@/lib/resolve-site-alias";

import BuiltWithFloatingButton from "@/components/built-with-floating-button";
import DataRequestBanner from "@/components/data-request-banner";
import Footer from "@/components/footer";
import Nav, { type Props as NavProps } from "@/components/nav";
import SiteMap from "@/components/site-map";
import TableOfContents from "@/components/table-of-contents";
import { SiteConfig } from "@/components/types";
import { SiteWithUser } from "@/types";
import { getSite } from "./get-site";
import { getThemeUrl } from "@/lib/get-theme";

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
  slug?: string[];
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
  const slug = params.slug ? params.slug.join("/") : "/";
  const decodedSlug = slug.replace(/%20/g, "+");

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

  console.log({ theme: siteConfig?.theme });
  const theme = siteConfig?.theme ? getThemeUrl(siteConfig.theme) : null;
  console.log({ themeUrl: theme });

  // Handle redirects if configured
  if (siteConfig?.redirects) {
    for (const r of siteConfig.redirects) {
      // Simple string comparison for exact path matching
      if ("/" + decodedSlug === r.from) {
        const redirectUrl = site.customDomain
          ? r.to
          : `${resolveSiteAlias(
              `/@${site.user?.ghUsername}/${site.projectName}`,
              "to",
            )}${r.to}`;

        return r.permanent
          ? permanentRedirect(redirectUrl)
          : redirect(redirectUrl);
      }
    }
  }

  let siteMap;

  if (siteConfig?.showSidebar) {
    siteMap = await api.site.getSiteMap
      .query({
        siteId: site.id,
      })
      .catch(() => []);
  }

  const { title, logo, url, links, social, cta } = getNavConfig({
    site,
    siteConfig,
  });

  let blob: Blob;

  try {
    blob = await api.site.getBlob.query({
      siteId: site.id,
      slug: decodedSlug,
    });
  } catch (error) {
    notFound();
  }

  const metadata = blob.metadata as unknown as PageMetadata;
  const isPlainLayout = metadata.layout === "plain";

  const showSidebar =
    !isPlainLayout &&
    (metadata.showSidebar ?? siteConfig?.showSidebar ?? false);
  const showToc =
    !isPlainLayout && (metadata.showToc ?? siteConfig?.showToc ?? true);
  const showDataRequestBanner = isFeatureEnabled(Feature.DataRequest, site);
  const showBuiltWithButton =
    !isFeatureEnabled(Feature.NoBranding, site) && !showDataRequestBanner;
  const showHero = metadata.showHero ?? siteConfig?.showHero;
  const showSearch =
    isFeatureEnabled(Feature.Search, site) && site.enableSearch;

  const resolveHeroCtaHref = (href: string) => {
    return resolveLink({
      link: href ?? "",
      filePath: blob.path,
      prefixPath: site.customDomain
        ? ""
        : `/@${site.user?.ghUsername}/${site.projectName}`,
    });
  };

  const resolveHeroImageSrc = (src: string) => {
    const rawFilePermalinkBase = site.customDomain
      ? `/_r/-`
      : `/@${site.user!.ghUsername}/${site.projectName}` + `/_r/-`;

    return resolveLink({
      link: src,
      filePath: blob.path,
      prefixPath: rawFilePermalinkBase,
    });
  };

  const searchResultPrefix = site.customDomain
    ? "/"
    : `/@${site.user!.ghUsername}/${site.projectName}/`;

  return (
    <>
      {/* it should be in the head */}
      {theme && <link rel="stylesheet" href={theme} />}
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {siteConfig?.analytics && <GoogleAnalytics gaId={siteConfig.analytics} />}

      <div className="flex w-full flex-col bg-inherit">
        <Nav
          logo={logo}
          url={url}
          cta={cta}
          title={title}
          links={links}
          social={social}
          showSiteMap={showSidebar}
          siteMap={siteMap}
          showSearch={showSearch}
          searchId={site.id}
          searchPrefix={searchResultPrefix}
        />

        {showHero && (
          <header className="hero relative bg-neutral-50">
            <div
              className={clsx(
                "hero-inner mx-auto",
                metadata.image
                  ? "max-w-screen-2xl lg:grid lg:grid-cols-12 lg:gap-x-8"
                  : "max-w-3xl text-center",
              )}
            >
              <div className="hero-text-wrapper pb-16 pt-10 sm:pb-20 lg:col-span-6 lg:px-0 lg:pb-32 lg:pt-28">
                <div className="mx-auto px-8 sm:px-10 lg:mx-0 lg:px-12">
                  <h1 className="hero-title text-pretty mt-24 text-5xl font-semibold tracking-tight text-primary-strong sm:mt-10 sm:text-6xl">
                    {metadata.title}
                  </h1>
                  <p className="hero-description text-pretty mt-8 text-lg font-medium text-primary sm:text-xl/8">
                    {metadata.description}
                  </p>
                  {metadata.cta && (
                    <div
                      className={clsx(
                        "mt-10 flex items-center gap-x-6",
                        !metadata.image && "justify-center",
                      )}
                    >
                      {metadata.cta[0] && (
                        <a
                          href={resolveHeroCtaHref(metadata.cta[0].href)}
                          className="rounded-md bg-secondary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-secondary/90"
                        >
                          {metadata.cta[0].label}
                        </a>
                      )}
                      {metadata.cta[1] && (
                        <a
                          href={resolveHeroCtaHref(metadata.cta[1].href)}
                          className="text-sm/6 font-semibold text-primary-strong"
                        >
                          {metadata.cta[1].label}
                          <span aria-hidden="true" className="ml-1">
                            →
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {metadata.image && (
                <div className="hero-image-wrapper relative lg:col-span-6 lg:-mr-8 xl:absolute xl:inset-0 xl:left-1/2 xl:mr-0">
                  <img
                    alt="Hero Image"
                    src={resolveHeroImageSrc(metadata.image)}
                    className="hero-image aspect-[3/2] w-full bg-gray-50 object-cover lg:absolute lg:inset-0 lg:aspect-auto lg:h-full"
                  />
                </div>
              )}
            </div>
          </header>
        )}

        <div className="relative">
          <div
            className={clsx(
              !isPlainLayout && [
                "mx-auto mt-16 grid w-full px-8 sm:px-10 lg:px-12",
                showSidebar &&
                  showToc &&
                  "max-w-screen-2xl grid-cols-[minmax(0,1fr)] gap-x-12 lg:grid-cols-[16rem,minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_12rem]",
                !showSidebar &&
                  showToc &&
                  "max-w-screen-xl grid-cols-[minmax(0,1fr)] gap-x-16 xl:grid-cols-[minmax(0,1fr),12rem]",
                showSidebar &&
                  !showToc &&
                  "max-w-screen-xl grid-cols-[minmax(0,1fr)] gap-x-16 xl:grid-cols-[12rem,minmax(0,1fr)]",
                !showSidebar && !showToc && "max-w-7xl",
              ],
            )}
          >
            {showSidebar && (
              <div className="hidden lg:block">
                <aside className="sticky top-[8rem] h-[calc(100vh-8rem)] overflow-y-auto pb-8 pr-4">
                  <SiteMap items={siteMap} />
                </aside>
              </div>
            )}

            <main>{children}</main>

            {showToc && (
              <div className="hidden xl:block">
                <aside
                  className={clsx(
                    "sticky top-[8rem] h-[calc(100vh-8rem)] overflow-y-auto pl-4",
                    showBuiltWithButton ? "pb-20" : "pb-8",
                  )}
                >
                  <TableOfContents />
                </aside>
              </div>
            )}
          </div>

          <div className="mx-auto w-full max-w-8xl px-8 sm:px-10 lg:px-12">
            <Footer />
          </div>
        </div>

        {showDataRequestBanner && <DataRequestBanner />}
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
    navConfig.cta = config.nav.cta;
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
