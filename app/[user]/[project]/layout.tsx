import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReactNode } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

import Nav, { type Props as NavProps } from "@/components/nav";
import Footer from "@/components/footer";
import TableOfContents from "@/components/table-of-contents";
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
import { BellIcon } from "lucide-react";
import clsx from "clsx";

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
  const showDataRequestBanner = isFeatureEnabled(Feature.DataRequest, site);

  return (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {siteConfig?.analytics && <GoogleAnalytics gaId={siteConfig.analytics} />}

      <div className="min-h-full">
        {!showSidebar && (
          <Nav
            title={title}
            logo={logo}
            url={url}
            links={links}
            social={social}
            cta={cta}
          />
        )}

        <div
          className={clsx(
            "mx-auto flex items-start gap-x-8 px-4 sm:px-6 lg:px-8",
            showSidebar ? "max-w-[92rem]" : "max-w-7xl",
          )}
        >
          {showSidebar && (
            <Sidebar title={title} logo={logo} url={url} items={treeItems} />
          )}

          <main className="flex-1 px-2 pt-12">
            {children}
            <div className={cn(showDataRequestBanner && "mb-12")}>
              <Footer />
            </div>
          </main>

          <aside
            className={clsx(
              "sticky hidden w-56 shrink-0",
              showSidebar ? "top-12 xl:block" : "top-28 lg:block",
            )}
          >
            <TableOfContents />
          </aside>

          {!showDataRequestBanner && <BuiltWithFloatingButton />}
          {showDataRequestBanner && <DataRequestBanner />}
        </div>
      </div>
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
