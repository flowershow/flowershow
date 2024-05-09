import { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { env } from "@/env.mjs";
import { api } from "@/trpc/server";
import { Nav } from "@/components/home/nav";
import { Footer } from "@/components/home/footer";
import config from "@/const/config";
import { PageMetadata } from "@/server/api/types";

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

  const siteConfig = await api.site.getSiteConfig.query({
    gh_username: params.user,
    projectName: params.project,
  });
  const title =
    siteConfig?.title ||
    (
      site?.files as {
        [url: string]: PageMetadata;
      }
    )["/"]?.title ||
    config.title;
  const description =
    siteConfig?.description ||
    (
      site?.files as {
        [url: string]: PageMetadata;
      }
    )["/"]?.description ||
    config.description;

  return {
    title: title,
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

  const siteConfig = await api.site.getSiteConfig.query({
    gh_username: params.user,
    projectName: params.project,
  });
  const title = siteConfig?.title || config.title;
  const logo = siteConfig?.logo || config.navbarTitle.logo;
  const navLinks = siteConfig?.navLinks || config.navLinks;

  return (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      <div className="min-h-screen bg-background">
        <Nav
          title={title}
          logo={logo}
          url={config.author.url}
          links={navLinks}
        />
        {children}

        {/* {domain == `demo.${env.NEXT_PUBLIC_ROOT_DOMAIN}` ||
                domain == `platformize.co` ? (
                <CTA />
            ) : (
                <ReportAbuse />
            )} */}

        <div className="mx-auto max-w-8xl px-4 md:px-8">
          <Footer
            links={config.footerLinks}
            author={config.author}
            social={config.social}
            description={config.description}
          />
        </div>
      </div>
    </>
  );
}

/*
 *         <div className={fontMapper[data.font]}>
 *             <div className="ease left-0 right-0 top-0 z-30 flex h-16 bg-white transition-all duration-150 dark:bg-black dark:text-white">
 *                 <div className="mx-auto flex h-full max-w-screen-xl items-center justify-center space-x-5 px-10 sm:px-20">
 *                     <Link href="/" className="flex items-center justify-center">
 *                         <div className="inline-block h-8 w-8 overflow-hidden rounded-full align-middle">
 *                             <Image
 *                                 alt={data.name || ""}
 *                                 height={40}
 *                                 src={data.logo || ""}
 *                                 width={40}
 *                             />
 *                         </div>
 *                         <span className="ml-3 inline-block truncate font-title font-medium">
 *                             {data.name}
 *                         </span>
 *                     </Link>
 *                 </div>
 *             </div>
 *
 *             <div className="mt-20">{children}</div>
 *
 *             {domain == `demo.${env.NEXT_PUBLIC_ROOT_DOMAIN}` ||
 *                 domain == `platformize.co` ? (
 *                 <CTA />
 *             ) : (
 *                 <ReportAbuse />
 *             )}
 *         </div> */
