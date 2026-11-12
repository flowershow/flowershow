/**
 * Count the frontmatter `layout` values pages already use.
 *
 * Read-only. Before `layout: docs` / `layout: reading` ship as site and page
 * settings, a maintainer needs to know whether those words are already used in
 * the wild for something else. Frontmatter is stored as JSON in
 * Blob.metadata, so this groups by Blob.metadata->>'layout' across all sites.
 *
 * Prints each value with its page count and site count, then lists the site
 * ids for `reading` and `docs`.
 *
 * USAGE:
 *
 *   npx tsx scripts/count-layout-values.ts
 *
 * REQUIREMENTS:
 *   - Run from the apps/flowershow directory
 *   - DATABASE_URL set in environment (production, to be useful)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WATCHED_VALUES = ['reading', 'docs'];

type CountRow = { layout: string; pages: bigint; sites: bigint };
type SiteRow = { siteId: string };

async function main() {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT
      metadata->>'layout' AS layout,
      COUNT(*) AS pages,
      COUNT(DISTINCT site_id) AS sites
    FROM "Blob"
    WHERE metadata->>'layout' IS NOT NULL
    GROUP BY metadata->>'layout'
    ORDER BY pages DESC
  `;

  if (rows.length === 0) {
    console.log('No pages set a frontmatter layout.');
  } else {
    console.log('layout value | pages | sites');
    for (const row of rows) {
      console.log(`${row.layout} | ${row.pages} | ${row.sites}`);
    }
  }

  for (const value of WATCHED_VALUES) {
    const sites = await prisma.$queryRaw<SiteRow[]>`
      SELECT DISTINCT site_id AS "siteId"
      FROM "Blob"
      WHERE metadata->>'layout' = ${value}
      ORDER BY site_id
    `;
    console.log(`\nSites using layout: ${value} (${sites.length})`);
    for (const site of sites) {
      console.log(`  ${site.siteId}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
