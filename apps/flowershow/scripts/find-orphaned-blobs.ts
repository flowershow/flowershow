/**
 * Find Orphaned Blobs (Database Records Without Storage Files)
 *
 * This script finds all blobs in the database that don't have a corresponding
 * file in S3/R2 storage. Useful for identifying and cleaning up orphaned
 * database records.
 *
 * USAGE:
 *
 *   # Find all orphaned blobs:
 *   npx tsx scripts/find-orphaned-blobs.ts
 *
 *   # Preview and delete orphaned blobs:
 *   npx tsx scripts/find-orphaned-blobs.ts --delete
 *
 *   # Dry run (preview what would be deleted):
 *   DRY_RUN=true npx tsx scripts/find-orphaned-blobs.ts --delete
 *
 * REQUIREMENTS:
 *   - Run from the flowershow directory
 *   - .env file with database and S3/R2 credentials
 *
 * WHAT IT DOES:
 *   1. Fetches all blobs from the database
 *   2. For each blob, checks if the file exists in R2 storage
 *   3. Reports blobs that don't have a corresponding storage file
 *   4. Optionally deletes orphaned blob records (--delete flag)
 *   5. Reports summary of found/deleted/failed operations
 */

import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
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

/**
 * Check if a file exists in S3/R2 storage
 */
async function fileExistsInStorage(key: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      }),
    );
    return true;
  } catch (error: any) {
    if (
      error?.name === 'NotFound' ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const shouldDelete = process.argv.includes('--delete');

  console.log('='.repeat(60));
  console.log('Find Orphaned Blobs');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('DRY RUN MODE — no deletions will be made\n');
  }
  if (shouldDelete) {
    console.log('DELETION MODE — orphaned blobs will be deleted\n');
  }

  // Fetch all blobs from database
  console.log('Fetching all blobs from database...\n');
  const allBlobs = await prisma.blob.findMany({
    select: {
      id: true,
      siteId: true,
      path: true,
      createdAt: true,
    },
  });

  console.log(`Found ${allBlobs.length} total blobs\n`);

  if (allBlobs.length === 0) {
    console.log('No blobs in database.');
    return;
  }

  // Check each blob for existence in storage
  const orphanedBlobs: typeof allBlobs = [];
  let checked = 0;
  let errors = 0;

  for (let i = 0; i < allBlobs.length; i++) {
    const blob = allBlobs[i]!;
    const progress = `[${i + 1}/${allBlobs.length}]`;

    try {
      const key = `${blob.siteId}/main/raw/${blob.path}`;
      const exists = await fileExistsInStorage(key);

      if (!exists) {
        console.log(`${progress} [ORPHANED] (${blob.siteId}) ${blob.path}`);
        orphanedBlobs.push(blob);
      }
      checked++;
    } catch (error: any) {
      console.error(
        `${progress} [ERROR] (${blob.siteId}) ${blob.path}: ${error.message || error}`,
      );
      errors++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total blobs checked: ${checked}`);
  console.log(`Orphaned blobs found: ${orphanedBlobs.length}`);
  console.log(`Check errors: ${errors}`);

  if (orphanedBlobs.length === 0) {
    console.log('\n✓ No orphaned blobs found!');
    return;
  }

  // Delete orphaned blobs if requested
  if (shouldDelete) {
    console.log('\n' + '='.repeat(60));
    console.log('Deletion');
    console.log('='.repeat(60));

    let deleted = 0;
    let deleteErrors = 0;

    for (let i = 0; i < orphanedBlobs.length; i++) {
      const blob = orphanedBlobs[i]!;
      const progress = `[${i + 1}/${orphanedBlobs.length}]`;

      try {
        if (dryRun) {
          console.log(
            `${progress} [DRY RUN] Would delete (${blob.siteId}) ${blob.path}`,
          );
          deleted++;
        } else {
          await prisma.blob.delete({
            where: { id: blob.id },
          });
          console.log(`${progress} [DELETED] (${blob.siteId}) ${blob.path}`);
          deleted++;
        }
      } catch (error: any) {
        console.error(
          `${progress} [ERROR] (${blob.siteId}) ${blob.path}: ${error.message || error}`,
        );
        deleteErrors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Deletion Summary');
    console.log('='.repeat(60));
    console.log(`Total deleted: ${deleted}`);
    console.log(`Delete errors: ${deleteErrors}`);

    if (dryRun) {
      console.log(
        '\nThis was a dry run. Remove DRY_RUN=true to perform actual deletion.',
      );
    }
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
