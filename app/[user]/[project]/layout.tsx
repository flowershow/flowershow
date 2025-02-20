import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReactNode } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

import Nav, { type Props as NavProps } from "@/components/nav";
import Footer from "@/components/footer";
import TableOfContentsSidebar from "@/components/table-of-content";
import Sidebar from "@/components/sidebar";
import BuiltWithFloatingButton from "@/components/built-with-floating-button";
import DataRequestBanner from "@/components/data-request-banner";

import { resolveLink } from "@/lib/resolve-link";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";
import type { SiteWithUser } from "@/types";
import { api } from "@/trpc/server";
import { env } from "@/env.mjs";
import { isInternalSite } from "@/lib/resolve-site-alias";
import { SiteConfig } from "@/components/types";
import { getConfig } from "@/lib/app-config";

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata | null> {
  const project = decodeURIComponent(params.project);
  const user = decodeURIComponent(params.user);

  const site = await getSiteData(user, project);

  // TODO should be saved to db and pulled from there along with the site data
  const siteConfig = await api.site.getConfig.query({
    gh_username: site.user!.gh_username!,
    projectName: site.projectName,
  });

  const title = siteConfig?.title || site.projectName;
  const description = siteConfig?.description || "";

  return {
    title: {
      template: "%s",
      default: title,
    },
    description,
    icons: [config.favicon],
    openGraph: {
      title,
      description,
      type: "website",
      /* url: author.url, */
      images: [
        {
          url: config.thumbnail,
          width: 1200,
          height: 630,
          alt: "Thumbnail",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: config.thumbnail,
          width: 1200,
          height: 630,
          alt: "Thumbnail",
        },
      ],
      creator: "@datopian",
    },
    metadataBase: new URL(
      env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
      env.NEXT_PUBLIC_VERCEL_ENV === "preview"
        ? `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}`
        : `http://localhost:3000`,
    ),
  };
}

export default async function SiteLayout({
  params,
  children,
}: {
  params: RouteParams;
  children: ReactNode;
}) {
  const project = decodeURIComponent(params.project);
  const user = decodeURIComponent(params.user); // user's github username or "_domain" (see middleware)

  const site = await getSiteData(user, project);
  const ghUsername = site.user?.gh_username!;

  const [customCss, siteConfig, treeItems] = await Promise.all([
    api.site.getCustomStyles
      .query({
        gh_username: ghUsername,
        projectName: site.projectName,
      })
      .catch(() => null),
    api.site.getConfig
      .query({
        gh_username: ghUsername,
        projectName: site.projectName,
      })
      .catch(() => null),
    api.site.getTree
      .query({
        gh_username: ghUsername,
        projectName: site.projectName,
      })
      .catch(() => []),
  ]);

  const { title, logo, url, links, social, cta } = getNavConfig({
    site,
    siteConfig,
  });
  const showSidebar = siteConfig?.showSidebar ?? false;
  const showToc = siteConfig?.showToc ?? true;
  const showDataRequestBanner = isFeatureEnabled(Feature.DataRequest, site);

  return (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {siteConfig?.analytics && <GoogleAnalytics gaId={siteConfig.analytics} />}

      <div className="min-h-screen">
        {showSidebar ? (
          // TODO add support for other Nav component props
          <Sidebar title={title} logo={logo} url={url} items={treeItems} />
        ) : (
          <Nav
            title={title}
            logo={logo}
            url={url}
            links={links}
            social={social}
            cta={cta}
          />
        )}
        <main
          className={cn(
            showSidebar ? "lg:pl-72" : "mx-auto flex max-w-8xl sm:px-4 md:px-8",
          )}
        >
          <div
            className={cn(
              "page-content flex min-h-screen w-full flex-col sm:px-4 lg:px-12",
              showSidebar
                ? "xl:px-12 xl:pr-[235px] 2xl:pr-[340px]"
                : "xl:px-12",
            )}
          >
            <div className="flex-grow">{children}</div>

            <div
              className={cn("mx-auto w-full", showDataRequestBanner && "mb-12")}
            >
              <Footer />
            </div>
          </div>
          {showToc && (
            <aside
              className={cn(
                "inset-y-0 right-0 hidden overflow-y-auto px-4 sm:px-2 xl:block",
                showSidebar
                  ? "fixed pb-[80px] pt-8 lg:px-8 xl:w-[235px] 2xl:w-[340px]"
                  : "sticky top-[100px] h-[calc(100vh-200px)] w-[200px] xl:px-0",
              )}
            >
              <TableOfContentsSidebar className="pt-4" />
            </aside>
          )}

          {!showDataRequestBanner && <BuiltWithFloatingButton />}
        </main>
      </div>
      {showDataRequestBanner && <DataRequestBanner />}
    </>
  );
}

async function getSiteData(
  user: string,
  project: string,
): Promise<SiteWithUser> {
  let site: SiteWithUser | null = null;

  if (user === "_domain") {
    site = await api.site.getByDomain.query({
      domain: project,
    });
  } else {
    site = await api.site.get.query({
      gh_username: user,
      projectName: project,
    });
  }

  if (!site) {
    notFound();
  }

  // Redirect to custom domain if it exists
  if (user !== "_domain" && site.customDomain) {
    return redirect(`https://${site.customDomain}`);
  }

  return site;
}

function getNavConfig({
  site,
  siteConfig,
}: {
  site: SiteWithUser;
  siteConfig: SiteConfig | null;
}): NavProps {
  const navConfig: NavProps = {
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
        prefixPath: `${protocol}${env.NEXT_PUBLIC_S3_BUCKET_DOMAIN}/${site.id}/${site.gh_branch}/raw`,
      });
    }

    navConfig.url = site.customDomain
      ? `https://${site.customDomain}`
      : `/@${site.user!.gh_username}/${site.projectName}`;

    navConfig.title = siteConfig?.nav?.title;

    if (siteConfig?.nav?.links) {
      navConfig.links = siteConfig?.nav?.links.map((link: any) => ({
        ...link,
        href: resolveLink({
          link: link.href,
          filePath: "config.json",
          prefixPath: site.customDomain
            ? ""
            : `/@${site.user?.gh_username}/${site.projectName}`,
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
            : `/@${site.user?.gh_username}/${site.projectName}`,
        }),
      }));
    }
  }

  return navConfig;
}
