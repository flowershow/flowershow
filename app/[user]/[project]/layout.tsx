import { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { env } from "@/env.mjs";
import { api } from "@/trpc/server";
import { Nav } from "@/components/home/nav";
import { Footer } from "@/components/home/footer";
import defaultConfig from "@/const/config";

export async function generateMetadata({
  params,
}: {
  params: { user: string; project: string };
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
    openGraph: {
      title: title,
      description: description,
      images: ["/thumbnail.png"], // TODO add support for project image
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: ["/thumbnail.png"], // TODO add support for project image
      creator: "@datopian",
    },
    icons: ["/favicon.ico"], // TODO add support for project favicon
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
  params: { user: string; project: string };
  children: ReactNode;
}) {
  const data = await api.site.get.query({
    gh_username: params.user,
    projectName: params.project,
  });

  if (!data) {
    notFound();
  }

  // Optional: Redirect to custom domain if it exists
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

  return (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      <div className="min-h-screen bg-background">
        <Nav title={title} logo={logo} url={url} links={navLinks} />
        {children}
        <div className="mx-auto max-w-8xl px-4 md:px-8">
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
