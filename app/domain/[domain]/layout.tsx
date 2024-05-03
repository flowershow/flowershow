import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";

export async function generateMetadata({
  params,
}: {
  params: { domain: string };
}): Promise<Metadata | null> {
  const domain = decodeURIComponent(params.domain);

  const site = await api.site.getByDomain.query({
    domain,
  });

  if (!site) {
    return null;
  }

  // temporary solution for site wide title and description
  const title =
    (
      site?.files as {
        [url: string]: PageMetadata;
      }
    )["/"]?.title || site.projectName;
  const description =
    (
      site?.files as {
        [url: string]: PageMetadata;
      }
    )["/"]?.description || "";

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
  params: { domain: string };
  children: ReactNode;
}) {
  const data = await api.site.getByDomain.query({
    domain: params.domain,
  });

  if (!data) {
    notFound();
  }

  const customCss = await api.site.getCustomStyles.query({
    gh_username: data.user!.gh_username!,
    projectName: data.projectName,
  });

  return (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      <div className="min-h-screen bg-background">{children}</div>
    </>
  );
}
