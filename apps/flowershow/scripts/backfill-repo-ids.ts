/**
 * Backfill installationRepositoryId for Sites
 *
 * After adding the installationRepositoryId FK, existing GitHub App sites need
 * to be linked to their GitHubInstallationRepository record. This makes webhook
 * push matching resilient to repository renames.
 *
 * USAGE:
 *
 *   # Backfill all sites:
 *   npx tsx scripts/backfill-repo-ids.ts
 *
 *   # Dry run (preview what would be updated):
 *   DRY_RUN=true npx tsx scripts/backfill-repo-ids.ts
 *
 * REQUIREMENTS:
 *   - Run from the apps/flowershow directory
 *   - DATABASE_URL set in environment
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === 'true';

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN MODE ===\n');
  }

  // Find all sites with a ghRepository but no installationRepositoryId yet
  const sites = await prisma.site.findMany({
    where: {
      ghRepository: { not: null },
      installationRepositoryId: null,
    },
    select: {
      id: true,
      projectName: true,
      ghRepository: true,
      userId: true,
    },
  });

  console.log(`Found ${sites.length} site(s) to backfill.\n`);

  let updated = 0;
  let skipped = 0;

  for (const site of sites) {
    // Look up the GitHubInstallationRepository by user's installations + repo name
    const repoRecord = await prisma.gitHubInstallationRepository.findFirst({
      where: {
        installation: { userId: site.userId! },
        repositoryFullName: site.ghRepository!,
      },
      select: { id: true, repositoryFullName: true },
    });

    if (!repoRecord) {
      console.log(
        `  SKIP: ${site.projectName} (${site.ghRepository}) — repo not found in user's installation repositories`,
      );
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `  WOULD UPDATE: ${site.projectName} (${site.ghRepository}) → installationRepositoryId=${repoRecord.id}`,
      );
    } else {
      await prisma.site.update({
        where: { id: site.id },
        data: { installationRepositoryId: repoRecord.id },
      });
      console.log(
        `  UPDATED: ${site.projectName} (${site.ghRepository}) → installationRepositoryId=${repoRecord.id}`,
      );
    }
    updated++;
  }

  console.log(
    `\nDone. ${DRY_RUN ? 'Would update' : 'Updated'}: ${updated}, Skipped: ${skipped}`,
  );
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
