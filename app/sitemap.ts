import { env } from "@/env.mjs";
import prisma from "@/server/db";

async function Sitemap() {
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
