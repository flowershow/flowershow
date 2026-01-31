/**
 * Migrate Non-Main Branches to /main/ Path Script
 *
 * This script migrates content from non-main branch paths to /main/ paths in S3.
 * This is needed because we're standardizing all content to use /main/ in S3 paths.
 *
 * USAGE:
 *
 *   # To migrate all sites with non-main branches:
 *   npx tsx scripts/migrate-non-main-branches.ts
 *
 *   # To preview what would be migrated (dry run):
 *   DRY_RUN=true npx tsx scripts/migrate-non-main-branches.ts
 *
 *   # To migrate specific sites by ID:
 *   npx tsx scripts/migrate-non-main-branches.ts site1,site2
 *
 * REQUIREMENTS:
 *   - The script must be run from the flowershow directory
 *   - Database connection must be configured (.env file)
 *   - S3/R2 credentials must be configured
 *
 * WHAT IT DOES:
 *   1. Finds all sites with ghBranch != 'main' (and not null)
 *   2. For each site, copies all S3 objects from /<siteId>/<branch>/ to /<siteId>/main/
 *   3. Deletes the original objects after successful copy
 *   4. Server-side copy - no bandwidth consumed
 */

import { PrismaClient } from '@prisma/client';
import { migrateBranchToMain, listAllObjects } from '../lib/content-store';

const prisma = new PrismaClient();

function parseSiteIds(args: string[]): string[] | null {
  if (args.length === 0) {
    return null; // null means "all sites"
  }

  const joined = args.join(' ');
  const ids = joined
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return ids.length > 0 ? ids : null;
}

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const specificSiteIds = parseSiteIds(process.argv.slice(2));

  console.log('='.repeat(60));
  console.log('Migrate Non-Main Branches to /main/ Path');
  console.log('='.repeat(60));
  console.log(dryRun ? 'DRY RUN MODE - No changes will be made\n' : '\n');

  // Find sites with non-main branches
  const whereClause: any = {
    ghBranch: {
      not: null,
      notIn: ['main'],
    },
  };

  if (specificSiteIds) {
    whereClause.id = { in: specificSiteIds };
    console.log(`Filtering to specific sites: ${specificSiteIds.join(', ')}\n`);
  }

  const sites = await prisma.site.findMany({
    where: whereClause,
    select: {
      id: true,
      ghBranch: true,
      projectName: true,
      user: {
        select: {
          ghUsername: true,
        },
      },
    },
  });

  console.log(`Found ${sites.length} site(s) with non-main branches\n`);

  if (sites.length === 0) {
    console.log('No sites to migrate. Exiting.');
    return;
  }

  // Count files for each site and sort by file count (lowest first)
  console.log('Counting files for each site to prioritize...\n');
  const sitesWithCounts = await Promise.all(
    sites.map(async (site) => {
      const objects = await listAllObjects(`${site.id}/${site.ghBranch}/`);
      return { site, fileCount: objects.length };
    }),
  );

  // Sort by file count (ascending - lowest first)
  sitesWithCounts.sort((a, b) => a.fileCount - b.fileCount);

  console.log('Sites prioritized by file count (lowest first):\n');
  for (const { site, fileCount } of sitesWithCounts) {
    const siteIdentifier = `${site.user?.ghUsername ?? 'unknown'}/${site.projectName}`;
    console.log(`  ${siteIdentifier}: ${fileCount} file(s)`);
  }
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  let totalObjectsMigrated = 0;
  const errors: Array<{ site: string; error: string }> = [];

  for (const { site, fileCount } of sitesWithCounts) {
    const siteIdentifier = `${site.user?.ghUsername ?? 'unknown'}/${site.projectName} (${site.id})`;
    const fromBranch = site.ghBranch!;

    console.log(`\nProcessing: ${siteIdentifier}`);
    console.log(`  Branch: ${fromBranch} -> main`);

    try {
      if (dryRun) {
        // In dry run, we already have the file count
        console.log(`  [DRY RUN] Would migrate ${fileCount} object(s)`);
        successCount++;
        totalObjectsMigrated += fileCount;
      } else {
        const count = await migrateBranchToMain(site.id, fromBranch);
        console.log(`  ✓ Migrated ${count} object(s)`);
        successCount++;
        totalObjectsMigrated += count;
      }
    } catch (error: any) {
      console.error(`  ✗ Failed: ${error.message}`);
      errorCount++;
      errors.push({
        site: siteIdentifier,
        error: error.message,
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total sites processed: ${sites.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(
    `Total objects ${dryRun ? 'to migrate' : 'migrated'}: ${totalObjectsMigrated}`,
  );

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const { site, error } of errors) {
      console.log(`  - ${site}: ${error}`);
    }
  }

  if (dryRun) {
    console.log('\n⚠️  This was a dry run. No changes were made.');
    console.log('Remove DRY_RUN=true to perform the actual migration.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✓ Script completed');
  })
  .catch(async (e) => {
    console.error('\n✗ Script failed with error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
