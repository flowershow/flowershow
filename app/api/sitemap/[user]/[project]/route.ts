import { getSiteUrl } from "@/lib/get-site-url";
import prisma from "@/server/db";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { user: string; project: string } },
) {
  const { user, project } = params;

  const site = await prisma.site.findFirst({
    where: {
      OR: [
        {
          user: {
            ghUsername: user,
          },
          projectName: project,
        },
        {
          customDomain: project,
        },
      ],
    },
    include: {
      user: true,
      blobs: {
        where: {
          syncStatus: "SUCCESS",
          OR: [{ path: { endsWith: ".md" } }, { path: { endsWith: ".mdx" } }],
        },
        select: {
          appPath: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!site) {
    return new Response("Not found", { status: 404 });
  }

  const siteUrl = getSiteUrl(site);

  // Create XML sitemap
  const xmlItems = site.blobs.map((blob) => {
    if (blob.appPath === "/") return "";
    return `<url>
      <loc>${siteUrl}/${blob.appPath}</loc>
      <lastmod>${blob.updatedAt.toISOString()}</lastmod>
    </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${siteUrl}</loc>
      <lastmod>${site.updatedAt.toISOString()}</lastmod>
    </url>${xmlItems.join("")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
