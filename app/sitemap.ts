import { env } from "@/env.mjs";
import prisma from "@/server/db";
// temporary solution to https://github.com/datopian/datahub/issues/1296
import { unstable_noStore as noStore } from "next/cache";

async function Sitemap() {
  noStore();

  const sites = await prisma.site.findMany({
    include: { user: true },
  });
  const internalPaths = ["/", "/enterprise", "/opensource", "/pricing"];

  const internalUrls = internalPaths.map(
    (path) => `${env.NEXT_PUBLIC_ROOT_DOMAIN}${path === "/" ? "" : path}`,
  );

  const userSiteUrls = sites.flatMap((site) => {
    const baseUrl = `${env.NEXT_PUBLIC_ROOT_DOMAIN}/@${
      site.user!.gh_username
    }/${site.projectName}`;

    return Object.keys((site.files as any) || []).map((url) => {
      if (url === "/") return baseUrl;
      return `${baseUrl}/${url}`;
    });
  });

  return [...internalUrls, ...userSiteUrls].map((url) => ({
    url,
    lastModified: new Date(),
  }));
}

export default Sitemap;
