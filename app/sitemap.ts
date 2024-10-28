import { env } from "@/env.mjs";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import prisma from "@/server/db";
// temporary solution to https://github.com/datopian/datahub/issues/1296
import { unstable_noStore as noStore } from "next/cache";

async function Sitemap() {
  noStore();

  const sites = await prisma.site.findMany({
    include: { user: true },
  });
  const internalPaths = ["/", "/collections", "/publish", "/pricing"];

  const internalUrls = internalPaths.map(
    (path) =>
      `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}${path === "/" ? "" : path}`,
  );

  const userSiteUrls = sites.flatMap((site) => {
    const { customDomain, projectName, user: siteUser } = site;

    const gh_username = siteUser!.gh_username!;

    // NOTE: don't include custom domain paths
    if (customDomain) return [];

    const sitePath = resolveSiteAlias(`/@${gh_username}/${projectName}`, "to");
    const baseUrl = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}${sitePath}`;

    return Object.keys((site.files as any) || []).map((url) => {
      if (url === "/") return baseUrl;
      return `${baseUrl}/${url.replace(/&/g, "%26")}`;
    });
  });

  return [...internalUrls, ...userSiteUrls].map((url) => ({
    url,
    // TODO temporary solution as we don't have this data in the db yet
    lastModified: new Date(),
  }));
}

export default Sitemap;
