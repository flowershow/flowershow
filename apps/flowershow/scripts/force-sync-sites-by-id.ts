/**
 * Force Sync Sites by ID Script
 *
 * This script triggers a force sync for specific sites by their IDs.
 * A force sync will re-sync all content from GitHub regardless of whether
 * changes are detected in the repository.
 *
 * USAGE:
 *
 *   # To trigger sync for specific sites (comma-separated):
 *   npx tsx scripts/force-sync-sites-by-id.ts site1,site2,site3
 *
 *   # To trigger sync for specific sites (space-separated):
 *   npx tsx scripts/force-sync-sites-by-id.ts site1 site2 site3
 *
 *   # To preview what would be synced (dry run):
 *   DRY_RUN=true npx tsx scripts/force-sync-sites-by-id.ts site1,site2
 *
 * REQUIREMENTS:
 *   - The script must be run from the datahub-next directory
 *   - Database connection must be configured (.env file)
 *   - Inngest must be properly configured
 *   - At least one site ID must be provided
 *
 * WHAT IT DOES:
 *   1. Parses the provided site IDs from command-line arguments
 *   2. Fetches the specified sites from the database
 *   3. For each site, sends an Inngest event to trigger force sync
 *   4. Supports both GitHub App installations and OAuth access tokens
 *   5. Skips sites without valid authentication
 *   6. Provides a summary of successful and failed syncs
 *
 * NOTE:
 *   - Syncs run asynchronously via Inngest
 *   - Monitor progress in the Inngest dashboard
 *   - Use DRY_RUN mode first to preview the operation
 */

import { PrismaClient } from '@prisma/client';
import { inngest } from '../inngest/client';

const prisma = new PrismaClient();

function parseSiteIds(args: string[]): string[] {
  if (args.length === 0) {
    return [];
  }

  // Join all arguments and split by both commas and spaces
  const joined = args.join(' ');
  const ids = joined
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return ids;
}

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const siteIds = parseSiteIds(process.argv.slice(2));

  console.log('='.repeat(60));
  console.log('Force Sync Sites by ID Script');
  console.log('='.repeat(60));
  console.log(dryRun ? 'DRY RUN MODE - No syncs will be triggered\n' : '\n');

  if (siteIds.length === 0) {
    console.error('❌ Error: No site IDs provided');
    console.log('\nUsage:');
    console.log(
      '  npx tsx scripts/force-sync-sites-by-id.ts <site-id1>,<site-id2>,...',
    );
    console.log(
      '  npx tsx scripts/force-sync-sites-by-id.ts <site-id1> <site-id2> ...',
    );
    console.log('\nExample:');
    console.log('  npx tsx scripts/force-sync-sites-by-id.ts abc123,def456');
    console.log('  npx tsx scripts/force-sync-sites-by-id.ts abc123 def456');
    process.exit(1);
  }

  console.log(`Site IDs to sync: ${siteIds.join(', ')}\n`);

  // Fetch sites by IDs
  const sites = await prisma.site.findMany({
    where: {
      id: {
        in: siteIds,
      },
    },
    include: {
      installationRepository: {
        select: { installationId: true, repositoryFullName: true },
      },
      user: {
        include: {
          accounts: {
            where: {
              provider: 'github',
            },
          },
        },
      },
    },
  });

  console.log(`Found ${sites.length} of ${siteIds.length} sites\n`);

  // Check for missing sites
  const foundIds = new Set(sites.map((s) => s.id));
  const missingIds = siteIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    console.log(`⚠️  Warning: ${missingIds.length} site(s) not found:`);
    for (const id of missingIds) {
      console.log(`  - ${id}`);
    }
    console.log();
  }

  if (sites.length === 0) {
    console.log('No sites found. Exiting.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ site: string; error: string }> = [];

  for (const site of sites) {
    const siteIdentifier = `${site.user?.ghUsername}/${site.projectName} (${site.id})`;

    // Check if user has GitHub account
    if (!site.user) {
      console.log(`⚠️  Skipping ${siteIdentifier}: No user associated`);
      errorCount++;
      errors.push({
        site: siteIdentifier,
        error: 'No user associated',
      });
      continue;
    }

    // GitHub App installation takes priority over OAuth
    const hasInstallation = !!site.installationRepositoryId;
    const githubAccount = site.user.accounts.find(
      (a) => a.provider === 'github',
    );

    // Need either installation ID or OAuth token
    if (!hasInstallation && !githubAccount?.access_token) {
      console.log(
        `⚠️  Skipping ${siteIdentifier}: No GitHub App installation or OAuth access token`,
      );
      errorCount++;
      errors.push({
        site: siteIdentifier,
        error: 'No GitHub App installation or OAuth access token',
      });
      continue;
    }

    const repoFullName =
      site.installationRepository?.repositoryFullName ?? site.ghRepository;

    // Validate required GitHub fields
    if (!repoFullName || !site.ghBranch) {
      console.log(
        `⚠️  Skipping ${siteIdentifier}: Missing repository or branch`,
      );
      errorCount++;
      errors.push({
        site: siteIdentifier,
        error: 'Missing repository or branch',
      });
      continue;
    }

    try {
      if (dryRun) {
        console.log(`[DRY RUN] Would sync: ${siteIdentifier}`);
        console.log(`  Repository: ${repoFullName}`);
        console.log(`  Branch: ${site.ghBranch}`);
        console.log(`  Root Dir: ${site.rootDir || '(none)'}`);
        console.log(
          `  Auth: ${hasInstallation ? 'GitHub App' : 'OAuth token'}`,
        );
        console.log();
        successCount++;
      } else {
        // Send sync event to Inngest with forceSync flag
        await inngest.send({
          name: 'site/sync',
          data: {
            siteId: site.id,
            ghRepository: repoFullName,
            ghBranch: site.ghBranch,
            rootDir: site.rootDir || null,
            accessToken: githubAccount?.access_token ?? undefined,
            installationId:
              site.installationRepository?.installationId ?? undefined,
            forceSync: true,
          },
        });

        console.log(`✓ Triggered force sync for: ${siteIdentifier}`);
        successCount++;
      }
    } catch (error: any) {
      console.error(`✗ Failed to sync ${siteIdentifier}:`, error.message);
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
  console.log(`Requested sites: ${siteIds.length}`);
  console.log(`Found sites: ${sites.length}`);
  console.log(
    `${dryRun ? 'Would sync' : 'Successfully triggered'}: ${successCount}`,
  );
  console.log(`Errors/Skipped: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\nErrors/Skipped Details:');
    for (const { site, error } of errors) {
      console.log(`  - ${site}: ${error}`);
    }
  }

  if (!dryRun && successCount > 0) {
    console.log('\n⚠️  Note: Syncs are running in the background via Inngest.');
    console.log('Check the Inngest dashboard to monitor progress.');
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
