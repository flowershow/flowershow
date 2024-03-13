import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { api } from "@/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: { domain: string };
}): Promise<Metadata | null> {
  const domain = decodeURIComponent(params.domain);
  /* const user = decodeURIComponent(params.user);

                  * const site = await api.site.get.query({
                  *   gh_username: user,
                  *   projectName: project,
                  * });

                  * if (!site) {
                  *   return null;
                  * } */

  return {
    title: domain,
    description: "", // TODO add support for project description
    openGraph: {
      title: domain,
      description: "", // TODO add support for project description
      images: ["/thumbnail.png"], // TODO add support for project image
    },
    twitter: {
      card: "summary_large_image",
      title: domain,
      description: "", // TODO add support for project description
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

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      {children}
    </div>
  );
}
