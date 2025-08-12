import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ReactNode } from "react";
import clsx from "clsx";

import { Blob } from "@prisma/client";
import { PageMetadata } from "@/server/api/types";
import { api } from "@/trpc/server";

import { getConfig } from "@/lib/app-config";
import { resolveLink } from "@/lib/resolve-link";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import { getThemeUrl } from "@/lib/get-theme";

import SiteTree from "@/components/public/site-tree";
import TableOfContents from "@/components/public/table-of-contents";
import { getSite } from "@/lib/get-site";

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

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);

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

  let siteTree;

  if (siteConfig?.showSidebar) {
    siteTree = await api.site.getSiteTree
      .query({
        siteId: site.id,
      })
      .catch(() => []);
  }

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
  const showHero = metadata.showHero ?? siteConfig?.showHero;

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
      {showHero && (
        <header className="page-hero-container">
          <div className={clsx("page-hero", metadata.image && "has-image")}>
            <div className="page-hero-content-container">
              <div className="page-hero-content">
                <h1 className="page-hero-title">{metadata.title}</h1>
                <p className="page-hero-description">{metadata.description}</p>
                {metadata.cta && (
                  <div className="page-hero-ctas-container">
                    {metadata.cta.map((cta) => (
                      <a
                        key={cta.label}
                        href={resolveHeroCtaHref(cta.href)}
                        className="page-hero-cta"
                      >
                        {cta.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {metadata.image && (
              <div className="page-hero-image-container">
                <img
                  alt="Hero Image"
                  src={resolveHeroImageSrc(metadata.image)}
                  className="page-hero-image"
                />
              </div>
            )}
          </div>
        </header>
      )}

      <div
        className={clsx(
          "layout-inner",
          showSidebar && showToc && "has-sidebar-and-toc",
          !showSidebar && showToc && "has-toc",
          showSidebar && !showToc && "has-sidebar",
        )}
      >
        {showSidebar && (
          <div className="layout-inner-left">
            <aside className="site-sidebar">
              <SiteTree items={siteTree} />
            </aside>
          </div>
        )}

        <div className="layout-inner-center">{children}</div>

        {showToc && (
          <div className="layout-inner-right">
            <aside className="page-toc">
              <TableOfContents />
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
