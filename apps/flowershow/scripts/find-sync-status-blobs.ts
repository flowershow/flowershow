/**
 * Find Blobs with UPLOADING or PROCESSING Sync Status
 *
 * This script finds all blobs in the database with sync_status of UPLOADING
 * or PROCESSING. Useful for identifying blobs stuck in upload/processing
 * states that may need attention.
 *
 * USAGE:
 *
 *   # Find all blobs with UPLOADING or PROCESSING status (saves to CSV):
 *   npx tsx scripts/find-sync-status-blobs.ts
 *
 *   # Find blobs with specific status:
 *   npx tsx scripts/find-sync-status-blobs.ts --status UPLOADING
 *   npx tsx scripts/find-sync-status-blobs.ts --status PROCESSING
 *
 * REQUIREMENTS:
 *   - Run from the flowershow directory
 *   - .env file with database credentials
 *
 * WHAT IT DOES:
 *   1. Fetches all blobs with UPLOADING or PROCESSING sync_status from the database
 *   2. Reports blobs with their sync status and metadata
 *   3. Saves results to CSV file
 *   4. Reports summary of found blobs
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape CSV field (handle quotes and commas)
 */
function escapeCsvField(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Initialize CSV file with headers
 */
function initializeCSVFile(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .split('T')[0];
  const filename = `sync-status-blobs-${timestamp}.csv`;

  const headers = [
    'ID',
    'Site ID',
    'Path',
    'Sync Status',
    'Created At',
    'Updated At',
  ];
  fs.writeFileSync(filename, headers.join(',') + '\n', 'utf-8');
  return filename;
}

/**
 * Append a single blob to CSV file
 */
function appendBlobToCSV(
  filename: string,
  blob: {
    id: string;
    siteId: string;
    path: string;
    syncStatus: string;
    createdAt: Date;
    updatedAt: Date;
  },
): void {
  const row = [
    escapeCsvField(blob.id),
    escapeCsvField(blob.siteId),
    escapeCsvField(blob.path),
    escapeCsvField(blob.syncStatus),
    escapeCsvField(blob.createdAt.toISOString()),
    escapeCsvField(blob.updatedAt.toISOString()),
  ].join(',');

  fs.appendFileSync(filename, row + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const statusFilter = process.argv.includes('--status')
    ? process.argv[process.argv.indexOf('--status') + 1]
    : null;

  console.log('='.repeat(60));
  console.log('Find Blobs with Sync Status Issues');
  console.log('='.repeat(60));
  console.log('');

  // Build query filter
  let whereClause: any;
  if (statusFilter) {
    console.log(`Filtering for status: ${statusFilter}\n`);
    whereClause = { syncStatus: statusFilter };
  } else {
    console.log(`Filtering for status: UPLOADING or PROCESSING\n`);
    whereClause = {
      syncStatus: {
        in: ['UPLOADING', 'PROCESSING'],
      },
    };
  }

  // Fetch blobs with problematic sync status
  console.log('Fetching blobs from database...\n');
  const blobs = await prisma.blob.findMany({
    where: whereClause,
    select: {
      id: true,
      siteId: true,
      path: true,
      syncStatus: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'asc' },
  });

  console.log(`Found ${blobs.length} blobs\n`);

  if (blobs.length === 0) {
    console.log('No blobs with problematic sync status found.');
    return;
  }

  // Initialize CSV file
  const csvFilename = initializeCSVFile();
  console.log(`Saving results to: ${csvFilename}\n`);

  // Write all blobs to CSV
  let uploadingCount = 0;
  let processingCount = 0;

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i]!;
    const progress = `[${i + 1}/${blobs.length}]`;

    console.log(
      `${progress} (${blob.syncStatus}) (${blob.siteId}) ${blob.path}`,
    );
    appendBlobToCSV(csvFilename, blob);

    if (blob.syncStatus === 'UPLOADING') {
      uploadingCount++;
    } else if (blob.syncStatus === 'PROCESSING') {
      processingCount++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total blobs found: ${blobs.length}`);
  if (!statusFilter) {
    console.log(`  - UPLOADING: ${uploadingCount}`);
    console.log(`  - PROCESSING: ${processingCount}`);
  }
  console.log(`\n✓ Results saved to: ${csvFilename}`);
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
