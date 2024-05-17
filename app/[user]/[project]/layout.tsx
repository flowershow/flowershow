import { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { env } from "@/env.mjs";
import { api } from "@/trpc/server";
import Nav from "@/components/sidebar-nav";
import { Footer } from "@/components/footer";
import defaultConfig from "@/const/config";

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

  const site = await api.site.get.query({
    gh_username: user,
    projectName: project,
  });

  if (!site) {
    return null;
  }

  const siteConfig = await api.site.getConfig.query({
    gh_username: params.user,
    projectName: params.project,
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
    // Set canonical URL to custom domain if it exists
    ...(site.customDomain && {
      alternates: {
        canonical: `https://${site.customDomain}`,
      },
    }),
  };
}

export default async function SiteLayout({
  params,
  children,
}: {
  params: RouteParams;
  children: ReactNode;
}) {
  const data = await api.site.get.query({
    gh_username: params.user,
    projectName: params.project,
  });

  if (!data) {
    notFound();
  }

  // Redirect to custom domain if it exists
  if (data.customDomain && env.REDIRECT_TO_CUSTOM_DOMAIN_IF_EXISTS === "true") {
    return redirect(`https://${data.customDomain}`);
  }

  const customCss = await api.site.getCustomStyles.query({
    gh_username: params.user,
    projectName: params.project,
  });

  const siteConfig = await api.site.getConfig.query({
    gh_username: params.user,
    projectName: params.project,
  });

  const title =
    siteConfig?.navbarTitle?.text ??
    siteConfig?.title ??
    defaultConfig.navbarTitle?.text ??
    defaultConfig.title;
  const logo =
    siteConfig?.navbarTitle?.logo ??
    siteConfig?.logo ??
    defaultConfig.navbarTitle?.logo ??
    defaultConfig.logo;
  let url: string;
  // temporary solution for all the datahubio sites currently published on Ola's account
  if (params.user === "olayway") {
    url = defaultConfig.author.url;
  } else {
    url = siteConfig?.author?.url ?? `/@${params.user}/${params.project}`;
  }
  const navLinks = siteConfig?.navLinks || defaultConfig.navLinks;

  const treeItems =
    (await api.site.getTree.query({
      gh_username: params.user,
      projectName: params.project,
    })) || [];

  return (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      <div>
        <Nav treeItems={treeItems} title={title} logo={logo} url={url} />
        <div className="min-h-screen sm:pl-60">
          {children}
          <Footer
            links={defaultConfig.footerLinks}
            author={defaultConfig.author}
            social={defaultConfig.social}
            description={defaultConfig.description}
          />
        </div>
      </div>
    </>
  );
}
