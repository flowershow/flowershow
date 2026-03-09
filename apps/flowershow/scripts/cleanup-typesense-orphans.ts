/**
 * Clean Up Orphaned Typesense Documents
 *
 * Removes Typesense documents whose corresponding blob no longer exists in the
 * database. These orphans accumulate when files are deleted via CLI or Obsidian
 * plugin endpoints that didn't previously clean up the search index.
 *
 * USAGE:
 *
 *   # Clean up specific sites:
 *   npx tsx scripts/cleanup-typesense-orphans.ts <site-id1> <site-id2>
 *
 *   # Clean up ALL sites that have a Typesense collection:
 *   npx tsx scripts/cleanup-typesense-orphans.ts --all
 *
 *   # Dry run (preview what would be deleted):
 *   DRY_RUN=true npx tsx scripts/cleanup-typesense-orphans.ts --all
 *
 * REQUIREMENTS:
 *   - Run from the flowershow directory
 *   - .env file with database and Typesense credentials
 *
 * WHAT IT DOES:
 *   1. For each site, retrieves all document IDs from the Typesense collection
 *   2. Looks up which blob IDs still exist in the database
 *   3. Deletes Typesense documents whose blob ID is missing from the DB
 */

import { PrismaClient } from '@prisma/client';
import { Client as TypesenseClient } from 'typesense';

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

const TYPESENSE_ADMIN_API_KEY = requireEnv('TYPESENSE_ADMIN_API_KEY');
const TYPESENSE_HOST = requireEnv('NEXT_PUBLIC_TYPESENSE_HOST');
const TYPESENSE_PORT = requireEnv('NEXT_PUBLIC_TYPESENSE_PORT');
const TYPESENSE_PROTOCOL = requireEnv('NEXT_PUBLIC_TYPESENSE_PROTOCOL');

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

const typesense = new TypesenseClient({
  nodes: [
    {
      host: TYPESENSE_HOST,
      port: parseInt(TYPESENSE_PORT),
      protocol: TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 5,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSiteIds(args: string[]): { siteIds: string[]; all: boolean } {
  if (args.includes('--all')) return { siteIds: [], all: true };
  const siteIds = args
    .join(' ')
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return { siteIds, all: false };
}

/**
 * Retrieve all document IDs from a Typesense collection using search with pagination.
 */
async function getAllDocumentIds(collectionName: string): Promise<string[]> {
  const ids: string[] = [];
  const pageSize = 250;
  let page = 1;
  let totalFound = Infinity;

  while (ids.length < totalFound) {
    const result = await typesense
      .collections(collectionName)
      .documents()
      .search({
        q: '*',
        per_page: pageSize,
        page,
        include_fields: 'id',
      });

    totalFound = result.found;

    if (!result.hits || result.hits.length === 0) break;

    for (const hit of result.hits) {
      if (hit.document && typeof (hit.document as any).id === 'string') {
        ids.push((hit.document as any).id);
      }
    }

    page++;
  }

  return ids;
}

/**
 * Get all Typesense collection names (each collection is named after a siteId).
 */
async function getAllCollectionNames(): Promise<string[]> {
  const collections = await typesense.collections().retrieve();
  return collections.map((c) => c.name);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function cleanupSite(
  siteId: string,
  dryRun: boolean,
): Promise<{ deleted: number; kept: number; errors: number }> {
  console.log(`\nProcessing site: ${siteId}`);
  console.log('-'.repeat(50));

  // 1. Check if collection exists
  let docIds: string[];
  try {
    docIds = await getAllDocumentIds(siteId);
  } catch (error: any) {
    if (error?.httpStatus === 404) {
      console.log(`  No Typesense collection found. Skipping.`);
      return { deleted: 0, kept: 0, errors: 0 };
    }
    throw error;
  }

  if (docIds.length === 0) {
    console.log(`  Collection is empty. Nothing to clean up.`);
    return { deleted: 0, kept: 0, errors: 0 };
  }

  console.log(`  Found ${docIds.length} documents in Typesense`);

  // 2. Check which blob IDs still exist in the database
  const existingBlobs = await prisma.blob.findMany({
    where: {
      id: { in: docIds },
      siteId,
    },
    select: { id: true },
  });
  const existingBlobIds = new Set(existingBlobs.map((b) => b.id));

  // 3. Find orphaned documents
  const orphanIds = docIds.filter((id) => !existingBlobIds.has(id));

  console.log(
    `  ${existingBlobIds.size} documents have matching blobs, ${orphanIds.length} are orphaned`,
  );

  if (orphanIds.length === 0) {
    return { deleted: 0, kept: docIds.length, errors: 0 };
  }

  // 4. Delete orphaned documents
  let deleted = 0;
  let errors = 0;

  for (const docId of orphanIds) {
    try {
      if (dryRun) {
        console.log(`    [DRY RUN] Would delete document: ${docId}`);
        deleted++;
      } else {
        await typesense
          .collections(siteId)
          .documents(docId)
          .delete({ ignore_not_found: true } as any);
        console.log(`    [DELETED] ${docId}`);
        deleted++;
      }
    } catch (error: any) {
      console.error(
        `    [ERROR] Failed to delete ${docId}: ${error.message || error}`,
      );
      errors++;
    }
  }

  return { deleted, kept: existingBlobIds.size, errors };
}

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const { siteIds: requestedIds, all } = parseSiteIds(process.argv.slice(2));

  console.log('='.repeat(60));
  console.log('Clean Up Orphaned Typesense Documents');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('DRY RUN MODE — no changes will be made\n');
  }

  let siteIds: string[];

  if (all) {
    console.log('Discovering all Typesense collections...');
    siteIds = await getAllCollectionNames();
    console.log(`Found ${siteIds.length} collections`);
  } else if (requestedIds.length > 0) {
    siteIds = requestedIds;
  } else {
    console.error('Error: No site IDs provided and --all not specified');
    console.log('\nUsage:');
    console.log(
      '  npx tsx scripts/cleanup-typesense-orphans.ts <site-id1> <site-id2>',
    );
    console.log('  npx tsx scripts/cleanup-typesense-orphans.ts --all');
    console.log('\nOptions:');
    console.log(
      '  --all          Process all sites with Typesense collections',
    );
    console.log('  DRY_RUN=true   Preview what would be deleted');
    process.exit(1);
  }

  console.log(`Sites to process: ${siteIds.length}`);

  let totalDeleted = 0;
  let totalKept = 0;
  let totalErrors = 0;

  for (const siteId of siteIds) {
    const result = await cleanupSite(siteId, dryRun);
    totalDeleted += result.deleted;
    totalKept += result.kept;
    totalErrors += result.errors;
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Sites processed:       ${siteIds.length}`);
  console.log(
    `Documents ${dryRun ? 'to delete' : 'deleted'}:    ${totalDeleted}`,
  );
  console.log(`Documents kept:        ${totalKept}`);
  console.log(`Errors:                ${totalErrors}`);

  if (dryRun) {
    console.log(
      '\nThis was a dry run. Remove DRY_RUN=true to perform actual deletion.',
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
