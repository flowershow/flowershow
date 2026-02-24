/**
 * Backfill Image Dimensions from Storage
 *
 * This script finds all images in the database that don't have dimensions saved,
 * fetches them from S3/R2 storage, extracts the dimensions using image-size,
 * and updates the database with the dimensions.
 *
 * Processes images in reverse chronological order (newest first) to prioritize
 * recently added content.
 *
 * USAGE:
 *
 *   # Backfill dimensions for all images across all sites:
 *   npx tsx scripts/backfill-image-dimensions.ts
 *
 *   # Dry run (preview what would be processed):
 *   DRY_RUN=true npx tsx scripts/backfill-image-dimensions.ts
 *
 * REQUIREMENTS:
 *   - Run from the flowershow directory
 *   - .env file with database and S3/R2 credentials
 *
 * WHAT IT DOES:
 *   1. Finds all image files in the database without dimensions (width or height is null)
 *   2. Orders images by creation date (newest first)
 *   3. Fetches each image from R2 storage
 *   4. Extracts dimensions using the image-size library
 *   5. Updates the Blob record in the database with width and height
 *   6. Reports summary of processed/skipped/failed images
 */

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { imageSize } from 'image-size';

// ---------------------------------------------------------------------------
// Configuration — read directly from process.env
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

// Supported image extensions
const SUPPORTED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'ico',
  'tiff',
  'tif',
  'bmp',
  'avif',
];

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

function extractImageDimensions(
  filePath: string,
  content: Buffer,
): { width: number | null; height: number | null } {
  try {
    const dimensions = imageSize(content);

    if (!dimensions.width || !dimensions.height) {
      return { width: null, height: null };
    }

    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    return { width: null, height: null };
  }
}

/**
 * Fetch a file's content from R2 as a buffer.
 */
async function fetchFileAsBuffer(key: string): Promise<Buffer | null> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      }),
    );
    const bytes = await response.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
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
  console.log('Backfill Image Dimensions from Storage');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('DRY RUN MODE — no changes will be made\n');
  }

  // Find all image blobs without dimensions, ordered by newest first
  console.log('Fetching images without dimensions...\n');
  const imagesWithoutDimensions = await prisma.blob.findMany({
    where: {
      extension: {
        in: SUPPORTED_IMAGE_EXTENSIONS,
      },
      OR: [{ width: null }, { height: null }],
    },
    select: {
      id: true,
      siteId: true,
      path: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc', // Newest first
    },
  });

  console.log(
    `Found ${imagesWithoutDimensions.length} images without dimensions\n`,
  );

  if (imagesWithoutDimensions.length === 0) {
    console.log('No images to process. All images have dimensions!');
    return;
  }

  // Process each image
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < imagesWithoutDimensions.length; i++) {
    const blob = imagesWithoutDimensions[i]!;
    const progress = `[${i + 1}/${imagesWithoutDimensions.length}]`;

    try {
      const key = `${blob.siteId}/main/raw/${blob.path}`;
      const buffer = await fetchFileAsBuffer(key);

      if (!buffer) {
        console.log(
          `${progress} [SKIP] (${blob.siteId}) ${blob.path} — file not found in storage`,
        );
        skipped++;
        continue;
      }

      const dimensions = extractImageDimensions(blob.path, buffer);

      if (!dimensions.width || !dimensions.height) {
        console.log(
          `${progress} [SKIP] (${blob.siteId}) ${blob.path} — could not extract dimensions`,
        );
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(
          `${progress} [DRY RUN] (${blob.siteId}) ${blob.path} → ${dimensions.width}x${dimensions.height}`,
        );
        processed++;
      } else {
        await prisma.blob.update({
          where: { id: blob.id },
          data: {
            width: dimensions.width,
            height: dimensions.height,
          },
        });
        console.log(
          `${progress} [OK] (${blob.siteId}) ${blob.path} → ${dimensions.width}x${dimensions.height}`,
        );
        processed++;
      }
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
  console.log(
    `Total images ${dryRun ? 'to process' : 'processed'}: ${processed}`,
  );
  console.log(`Total images skipped: ${skipped}`);
  console.log(`Total errors: ${errors}`);

  if (dryRun) {
    console.log(
      '\nThis was a dry run. Remove DRY_RUN=true to perform actual backfilling.',
    );
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
