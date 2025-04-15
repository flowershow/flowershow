import { env } from "@/env.mjs";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import prisma from "@/server/db";
// temporary solution to https://github.com/datopian/datahub/issues/1296
import { unstable_noStore as noStore } from "next/cache";

async function Sitemap() {
  noStore();

  const sites = await prisma.site.findMany({
    include: {
      user: true,
      blobs: {
        where: {
          syncStatus: "SUCCESS",
          OR: [
            { appPath: { endsWith: ".md" } },
            { appPath: { endsWith: ".mdx" } },
          ],
        },
        select: {
          appPath: true,
          updatedAt: true,
        },
      },
    },
  });

  const userSiteUrls = sites.flatMap((site) => {
    const { customDomain, projectName, user: siteUser, blobs } = site;

    const gh_username = siteUser!.gh_username!;

    // NOTE: don't include custom domain paths
    if (customDomain) return [];

    const sitePath = resolveSiteAlias(`/@${gh_username}/${projectName}`, "to");
    const baseUrl = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}${sitePath}`;

    // Add the base site URL
    const urls = [
      {
        url: baseUrl,
        lastModified: site.updatedAt,
      },
    ];

    // Add URLs for each blob
    blobs.forEach((blob) => {
      if (blob.appPath === "/") return; // Skip root path as it's already added
      urls.push({
        url: `${baseUrl}/${blob
          .appPath!.replace(/^\//, "")
          .replace(/&/g, "%26")}`,
        lastModified: blob.updatedAt,
      });
    });

    return urls;
  });

  return userSiteUrls;
}

export default Sitemap;
