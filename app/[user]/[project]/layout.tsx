import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReactNode } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Site } from "@prisma/client";

import Navbar from "@/components/nav";
import Footer from "@/components/footer";
import defaultConfig from "@/const/config";
import TableOfContentsSidebar from "@/components/table-of-content";
import Sidebar from "@/components/sidebar";
import BuiltWithDataHub from "@/components/built-with-datahub";
import { DataRequestBanner } from "@/components/data-request-banner";
import { resolveLink } from "@/lib/resolve-link";
import { isCoreDatasetOrCollection } from "@/lib/is-core-dataset";
import { api } from "@/trpc/server";
import { env } from "@/env.mjs";
import { cn } from "@/lib/utils";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

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
    icons: ["/favicon.ico"],
    openGraph: {
      title,
      description,
      type: "website",
      /* url: author.url, */
      images: [
        {
          url: "/thumbnail.png",
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
          url: "/thumbnail.png",
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
  const user = decodeURIComponent(params.user);

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
    // Redirect to custom domain if it exists
    if (
      site &&
      site.customDomain &&
      env.REDIRECT_TO_CUSTOM_DOMAIN_IF_EXISTS === "true"
    ) {
      return redirect(`https://${site.customDomain}`);
    }
  }

  if (!site) {
    notFound();
  }

  const customCss = await api.site.getCustomStyles.query({
    gh_username: site.user!.gh_username!,
    projectName: site.projectName,
  });
  const siteConfig = await api.site.getConfig.query({
    gh_username: site.user!.gh_username!,
    projectName: site.projectName,
  });

  const title =
    siteConfig?.navbarTitle?.text ??
    siteConfig?.title ??
    defaultConfig.navbarTitle?.text ??
    defaultConfig.title;

  const customLogoPath = siteConfig?.navbarTitle?.logo ?? siteConfig?.logo;

  const logo = customLogoPath
    ? resolveLink({
        link: customLogoPath,
        filePath: "config.json",
        prefixPath: `https://${env.NEXT_PUBLIC_R2_BUCKET_DOMAIN}/${site.id}/${site.gh_branch}/raw`,
      })
    : defaultConfig.navbarTitle?.logo ?? defaultConfig.logo;

  let url: string;
  // TODO temporary solution for all the datahubio sites currently published on Ola's account
  if (user === "olayway" && process.env.NODE_ENV === "production") {
    url = defaultConfig.author.url;
  } else {
    url = site.customDomain
      ? `https://${site.customDomain}`
      : siteConfig?.author?.url ?? `/@${params.user}/${params.project}`;
  }

  // TODO get either navLinks or treeItems, not both
  const navLinks = siteConfig?.navLinks || defaultConfig.navLinks;

  const treeItems =
    (await api.site.getTree.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
    })) || [];

  const socialLinks = siteConfig?.social;
  const footerDescription = siteConfig?.description;
  const showSidebar = siteConfig?.showSidebar;
  const showToc = siteConfig?.showToc ?? true;

  const showDataRequestBanner = isCoreDatasetOrCollection(site);

  return (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {siteConfig?.analytics && <GoogleAnalytics gaId={siteConfig.analytics} />}

      <div className="min-h-screen">
        {!showSidebar ? (
          <Navbar
            title={title}
            logo={logo}
            url={url}
            links={navLinks}
            social={socialLinks}
          />
        ) : (
          <Sidebar title={title} logo={logo} url={url} navigation={treeItems} />
        )}
        <main
          className={`${
            showSidebar ? "lg:pl-72" : "mx-auto flex max-w-8xl sm:px-4 md:px-8"
          }`}
        >
          <div
            className={`page-content flex min-h-screen w-full flex-col sm:px-4 lg:px-12 ${
              showSidebar
                ? "xl:px-12 xl:pr-[235px] 2xl:pr-[340px]"
                : " xl:px-12"
            }`}
          >
            <div className="flex-grow">{children}</div>

            <div
              className={cn("mx-auto w-full", showDataRequestBanner && "mb-12")}
            >
              <Footer
                author={siteConfig?.author}
                social={socialLinks}
                description={footerDescription}
              />
            </div>
          </div>
          {showToc && (
            <aside
              className={`inset-y-0 right-0 hidden overflow-y-auto px-4 sm:px-2  xl:block  ${
                showSidebar
                  ? "fixed pb-[80px] pt-8 lg:px-8 xl:w-[235px] 2xl:w-[340px]"
                  : "sticky top-[100px] h-[calc(100vh-200px)] w-[200px] xl:px-0"
              }`}
            >
              <TableOfContentsSidebar className="pt-4" />
            </aside>
          )}

          {!showDataRequestBanner && <BuiltWithDataHub />}
        </main>
      </div>
      {showDataRequestBanner && <DataRequestBanner />}
    </>
  );
}
