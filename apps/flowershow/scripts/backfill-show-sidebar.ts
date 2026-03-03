/**
 * Backfill show_sidebar from config.json
 *
 * After the migration sets all existing sites to show_sidebar=false,
 * this script reads each site's config.json from R2 and flips
 * show_sidebar to true for sites that had showSidebar: true.
 *
 * USAGE:
 *
 *   # Backfill all sites:
 *   npx tsx scripts/backfill-show-sidebar.ts
 *
 *   # Dry run (preview what would change):
 *   DRY_RUN=true npx tsx scripts/backfill-show-sidebar.ts
 *
 * REQUIREMENTS:
 *   - Run from the flowershow directory
 *   - .env file with database and S3/R2 credentials
 */

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const S3_ENDPOINT = requireEnv('S3_ENDPOINT');
const S3_ACCESS_KEY_ID = requireEnv('S3_ACCESS_KEY_ID');
const S3_SECRET_ACCESS_KEY = requireEnv('S3_SECRET_ACCESS_KEY');
const S3_BUCKET_NAME = requireEnv('S3_BUCKET_NAME');
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === 'true';

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: S3_FORCE_PATH_STYLE,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchConfigJson(
  siteId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: `${siteId}/main/raw/config.json`,
      }),
    );
    const text = await response.Body?.transformToString();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error: any) {
    if (error?.name === 'NoSuchKey') return null;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';

  console.log('='.repeat(60));
  console.log('Backfill show_sidebar from config.json');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('DRY RUN MODE — no changes will be made\n');
  }

  const sites = await prisma.site.findMany({
    where: { showSidebar: false },
    select: { id: true, projectName: true },
  });

  console.log(`Found ${sites.length} sites with show_sidebar=false\n`);

  let flipped = 0;
  let skipped = 0;
  let noConfig = 0;
  let errors = 0;

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i]!;
    const progress = `[${i + 1}/${sites.length}]`;

    try {
      const config = await fetchConfigJson(site.id);

      if (!config) {
        console.log(
          `${progress} [SKIP] ${site.projectName} (${site.id}) — no config.json`,
        );
        noConfig++;
        continue;
      }

      if (config.showSidebar !== true) {
        console.log(
          `${progress} [SKIP] ${site.projectName} (${site.id}) — showSidebar not true`,
        );
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(
          `${progress} [DRY RUN] ${site.projectName} (${site.id}) → would flip to true`,
        );
      } else {
        await prisma.site.update({
          where: { id: site.id },
          data: { showSidebar: true },
        });
        console.log(
          `${progress} [OK] ${site.projectName} (${site.id}) → flipped to true`,
        );
      }
      flipped++;
    } catch (error: any) {
      console.error(
        `${progress} [ERROR] ${site.projectName} (${site.id}): ${error.message || error}`,
      );
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total sites: ${sites.length}`);
  console.log(`Flipped to true: ${flipped}`);
  console.log(`No config.json: ${noConfig}`);
  console.log(`Skipped (showSidebar not true): ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (dryRun) {
    console.log(
      '\nThis was a dry run. Remove DRY_RUN=true to perform actual backfilling.',
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\nScript completed');
  })
  .catch(async (e) => {
    console.error('\nScript failed with error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
