import type { MetadataRoute } from "next";
import { env } from "@/env.mjs";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import prisma from "@/server/db";

type Props = {
  params: { user: string; project: string };
};

export default async function robots({
  params: { user, project },
}: Props): Promise<MetadataRoute.Robots> {
  const site = await prisma.site.findFirst({
    where: {
      user: {
        ghUsername: user,
      },
      projectName: project,
    },
  });

  if (!site) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  const { customDomain } = site;

  // If no custom domain, don't generate robots.txt
  if (!customDomain) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  // For custom domains, point to /sitemap.xml which will be handled by middleware
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${customDomain}/sitemap.xml`,
  };
}
