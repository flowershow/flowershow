import { unstable_noStore as noStore } from 'next/cache';
import { getSiteUrl } from '@/lib/get-site-url';
import prisma from '@/server/db';

async function Sitemap() {
  noStore();

  const sites = await prisma.site.findMany({
    include: {
      user: true,
    },
  });

  const sitemapUrls: Array<{ url: string; lastModified: Date }> = [];
  sites.forEach((site) => {
    if (site.customDomain) return;

    const siteUrl = getSiteUrl(site);

    sitemapUrls.push({
      url: `${siteUrl}/sitemap.xml`,
      lastModified: site.updatedAt,
    });
  });

  return sitemapUrls;
}

export default Sitemap;
