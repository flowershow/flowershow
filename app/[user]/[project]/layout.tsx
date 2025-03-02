import { ReactNode } from "react";
import { api } from "@/trpc/server";
import { env } from "@/env.mjs";
import { getConfig } from "@/lib/app-config";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { SiteWithUser } from "@/types";
import { notFound, redirect } from "next/navigation";
import { SiteConfig } from "@/components/types";
import { isInternalSite } from "@/lib/resolve-site-alias";
import { resolveLink } from "@/lib/resolve-link";
import Nav, { type Props as NavProps } from "@/components/nav";
import SiteMap from "@/components/site-map";
import Footer from "@/components/footer";
import BuiltWithFloatingButton from "@/components/built-with-floating-button";
import DataRequestBanner from "@/components/data-request-banner";
import clsx from "clsx";
import TableOfContents from "@/components/table-of-contents";

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
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

  const [customCss, siteConfig, siteMap] = await Promise.all([
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
  // TODO rename config to showSitemap
  const showSitemap = siteConfig?.showSidebar ?? false;
  // const showHero = true; // TODO
  const showDataRequestBanner = isFeatureEnabled(Feature.DataRequest, site);

  return (
    <div className="flex min-h-full flex-col">
      <Nav
        logo={logo}
        url={url}
        cta={cta}
        title={title}
        links={links}
        social={social}
        siteMap={siteMap}
      />

      {/* <div className="relative isolate bg-gradient-to-r from-yellow-100/10 to-white px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 lg:py-36">
          <div className="text-center">
            <h1 className="text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl">
              Data to enrich your online business
            </h1>
            <p className="text-pretty mt-8 text-lg font-medium text-gray-500 sm:text-xl/8">
              Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure qui
              lorem cupidatat commodo. Elit sunt amet fugiat veniam occaecat.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="#"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Get started
              </a>
              <a href="#" className="text-sm/6 font-semibold text-gray-900">
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div> */}

      <div
        className={clsx(
          "mx-auto mt-16 grid w-full px-8 sm:px-10 lg:px-12",
          showSitemap
            ? "max-w-screen-2xl grid-cols-[minmax(0,1fr)] gap-x-12 lg:grid-cols-[16rem,minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_12rem]"
            : "max-w-screen-xl grid-cols-[minmax(0,1fr)] gap-x-16 xl:grid-cols-[minmax(0,1fr),12rem]",
        )}
      >
        {showSitemap && (
          <div className="hidden lg:block">
            <aside className="sticky top-[8rem] min-h-[85vh] border-r pr-6">
              <SiteMap items={siteMap} />
            </aside>
          </div>
        )}

        <main>{children}</main>

        <div className="hidden xl:block">
          <aside className="sticky top-[8rem]">
            <TableOfContents />
          </aside>
        </div>
      </div>

      <div className="mx-auto w-full max-w-8xl px-8 sm:px-10 lg:px-12">
        <Footer />
      </div>

      {showDataRequestBanner ? (
        <DataRequestBanner />
      ) : (
        <BuiltWithFloatingButton />
      )}
    </div>
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
