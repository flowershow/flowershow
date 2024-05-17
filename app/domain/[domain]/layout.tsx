import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { api } from "@/trpc/server";
import { env } from "@/env.mjs";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/nav";
import Footer from "@/components/footer";
import defaultConfig from "@/const/config";
import { resolveLink } from "@/lib/resolve-link";

interface RouteParams {
  domain: string;
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata | null> {
  const domain = decodeURIComponent(params.domain);

  const site = await api.site.getByDomain.query({
    domain,
  });

  if (!site) {
    return null;
  }

  const siteConfig = await api.site.getConfig.query({
    gh_username: site.user?.gh_username!,
    projectName: site.projectName,
  });

  const title = siteConfig?.title || site.projectName;
  const description = siteConfig?.description || "";

  return {
    title: {
      template: "%s",
      default: title,
    },
    description: description,
    // TODO add everything below to config
    openGraph: {
      title: title,
      description: description,
      images: ["/thumbnail.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: ["/thumbnail.png"],
      creator: "@datopian",
    },
    icons: ["/favicon.ico"],
    // Optional: Set canonical URL to custom domain if it exists
    // ...(params.domain.endsWith(`.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) &&
    //   data.customDomain && {
    //     alternates: {
    //       canonical: `https://${data.customDomain}`,
    //     },
    //   }),
  };
}

export default async function SiteLayout({
  params,
  children,
}: {
  params: RouteParams;
  children: ReactNode;
}) {
  const site = await api.site.getByDomain.query({
    domain: params.domain,
  });

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

  const logoPath =
    siteConfig?.navbarTitle?.logo ??
    siteConfig?.logo ??
    defaultConfig.navbarTitle?.logo ??
    defaultConfig.logo;

  const logo = resolveLink({
    link: logoPath,
    filePath: "config.json",
    prefixPath: `https://${env.NEXT_PUBLIC_R2_BUCKET_DOMAIN}/${site.id}/${site.gh_branch}/raw`,
  });

  const url = siteConfig?.author?.url ?? site.customDomain;

  // TODO get either navLinks or treeItems, not both
  const navLinks = siteConfig?.navLinks || [];

  const treeItems =
    (await api.site.getTree.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
    })) || [];

  return (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {siteConfig?.showSidebar ? (
        <div>
          <Sidebar title={title} logo={logo} url={url} treeItems={treeItems} />
          <div className="min-h-screen sm:pl-60">
            {children}
            <Footer
              author={defaultConfig.author}
              social={defaultConfig.social}
              description={defaultConfig.description}
            />
          </div>
        </div>
      ) : (
        <div className="min-h-screen">
          <Navbar title={title} logo={logo} url={url} links={navLinks} />
          {children}
          <Footer
            links={defaultConfig.footerLinks}
            author={defaultConfig.author}
            social={defaultConfig.social}
            description={defaultConfig.description}
          />
        </div>
      )}
    </>
  );
}
