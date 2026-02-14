/**
 * Reindex Site Content in Typesense from R2
 *
 * This script reads markdown files from R2 for a given site and indexes them
 * in Typesense. Useful for fixing sites that were created via CLI or Obsidian
 * plugin before the ensureSiteCollection fix, where content was uploaded to R2
 * but never indexed in Typesense.
 *
 * The indexing logic mirrors the Cloudflare Worker (cloudflare-worker/src/worker.js)
 * to ensure documents are indexed identically.
 *
 * USAGE:
 *
 *   # Reindex a single site:
 *   npx tsx scripts/reindex-site-typesense.ts <site-id>
 *
 *   # Reindex multiple sites (comma or space separated):
 *   npx tsx scripts/reindex-site-typesense.ts site1,site2,site3
 *   npx tsx scripts/reindex-site-typesense.ts site1 site2 site3
 *
 *   # Dry run (preview what would be indexed):
 *   DRY_RUN=true npx tsx scripts/reindex-site-typesense.ts <site-id>
 *
 * REQUIREMENTS:
 *   - Run from the flowershow directory
 *   - .env file with database, S3/R2, and Typesense credentials
 *
 * WHAT IT DOES:
 *   1. Validates the site exists in the database
 *   2. Ensures a Typesense collection exists for the site
 *   3. Lists all objects in R2 under {siteId}/main/raw/
 *   4. Fetches each markdown/mdx file
 *   5. Parses frontmatter and extracts title (matching worker logic)
 *   6. Looks up the Blob ID from the database (used as document ID)
 *   7. Upserts each document into Typesense
 *   8. Reports summary of indexed/skipped/failed documents
 *
 * RELATED:
 *   - flowershow-8af: Typesense collection not created for CLI/Obsidian/anon publish paths
 *   - flowershow-6bk: This script's tracking issue
 */

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import matter from 'gray-matter';
import { Client as TypesenseClient } from 'typesense';

// ---------------------------------------------------------------------------
// Configuration — read directly from process.env to avoid env.mjs full validation
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

const TYPESENSE_ADMIN_API_KEY = requireEnv('TYPESENSE_ADMIN_API_KEY');
const TYPESENSE_HOST = requireEnv('NEXT_PUBLIC_TYPESENSE_HOST');
const TYPESENSE_PORT = requireEnv('NEXT_PUBLIC_TYPESENSE_PORT');
const TYPESENSE_PROTOCOL = requireEnv('NEXT_PUBLIC_TYPESENSE_PROTOCOL');

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
// Typesense schema (mirrors lib/typesense.ts)
// ---------------------------------------------------------------------------

const siteCollectionSchema = {
  fields: [
    { name: 'title', type: 'string' as const, facet: false },
    { name: 'content', type: 'string' as const, facet: false },
    { name: 'path', type: 'string' as const, facet: false },
    {
      name: 'description',
      type: 'string' as const,
      facet: false,
      optional: true,
    },
    {
      name: 'authors',
      type: 'string[]' as const,
      facet: false,
      optional: true,
    },
    { name: 'date', type: 'int64' as const, facet: false, optional: true },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSiteIds(args: string[]): string[] {
  if (args.length === 0) return [];
  return args
    .join(' ')
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

function isMarkdown(key: string): boolean {
  return /\.(md|mdx)$/i.test(key);
}

/**
 * Extract the file path relative to the site root from an R2 key.
 * Key format: {siteId}/main/raw/{path}
 */
function extractPath(key: string, siteId: string): string {
  const prefix = `${siteId}/main/raw/`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

/**
 * Extract a title from the first H1 heading in the markdown body.
 * Mirrors cloudflare-worker/src/parser.js extractTitle().
 */
function extractTitle(source: string): string | null {
  const heading = source.trim().match(/^#{1}[ ]+(.*)/);
  if (heading?.[1]) {
    const title = heading[1]
      // replace wikilink with only text value
      .replace(/\[\[([\S\s]*?)]]/, '$1')
      // remove markdown formatting
      .replace(/[_*~`>]/g, '') // remove markdown characters
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // remove links but keep the text
    return title.trim();
  }
  return null;
}

/**
 * Parse markdown file — mirrors cloudflare-worker/src/parser.js parseMarkdownFile().
 * Returns metadata (frontmatter + resolved title) and body.
 */
function parseMarkdownFile(
  markdown: string,
  path: string,
): { metadata: Record<string, any>; body: string } {
  const { data: frontmatter, content: body } = matter(markdown);

  const title =
    frontmatter.title ||
    extractTitle(body) ||
    path
      .split('/')
      .pop()
      ?.replace(/\.(mdx|md)$/, '') ||
    '';

  return {
    metadata: {
      ...frontmatter,
      title,
    },
    body,
  };
}

/**
 * List all R2 objects under a prefix (handles pagination).
 */
async function listAllObjects(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) keys.push(obj.Key);
      }
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

/**
 * Fetch a file's content from R2 as a string.
 */
async function fetchFileContent(key: string): Promise<string | null> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      }),
    );
    return (await response.Body?.transformToString()) ?? null;
  } catch (error: any) {
    if (error?.name === 'NoSuchKey') return null;
    throw error;
  }
}

/**
 * Ensure a Typesense collection exists for the site, creating it if needed.
 */
async function ensureCollection(siteId: string): Promise<void> {
  try {
    await typesense.collections().create({
      name: siteId,
      ...siteCollectionSchema,
    });
    console.log(`  Created Typesense collection: ${siteId}`);
  } catch (error: any) {
    if (error?.httpStatus === 409) {
      console.log(`  Typesense collection already exists: ${siteId}`);
    } else {
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function reindexSite(siteId: string, dryRun: boolean) {
  console.log(`\nProcessing site: ${siteId}`);
  console.log('-'.repeat(50));

  // 1. Verify site exists
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      projectName: true,
      user: { select: { ghUsername: true } },
    },
  });

  if (!site) {
    console.log(`  Site not found in database. Skipping.`);
    return { indexed: 0, skipped: 0, errors: 0, notFound: true };
  }

  const siteLabel = `${site.user?.ghUsername ?? 'unknown'}/${site.projectName}`;
  console.log(`  Site: ${siteLabel}`);

  // 2. Ensure Typesense collection exists
  if (!dryRun) {
    await ensureCollection(siteId);
  } else {
    console.log(`  [DRY RUN] Would ensure Typesense collection exists`);
  }

  // 3. List all markdown files in R2
  const prefix = `${siteId}/main/raw/`;
  const allKeys = await listAllObjects(prefix);
  const markdownKeys = allKeys.filter(isMarkdown);

  console.log(
    `  Found ${allKeys.length} total objects, ${markdownKeys.length} markdown files`,
  );

  if (markdownKeys.length === 0) {
    console.log(`  No markdown files to index.`);
    return { indexed: 0, skipped: 0, errors: 0, notFound: false };
  }

  // 4. Pre-fetch all blob IDs for this site so we can use them as document IDs
  //    (mirrors the worker which uses Blob.id as the Typesense document ID)
  const blobs = await prisma.blob.findMany({
    where: { siteId },
    select: { id: true, path: true },
  });
  const blobByPath = new Map(blobs.map((b) => [b.path, b.id]));

  // 5. Process each markdown file
  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  for (const key of markdownKeys) {
    const filePath = extractPath(key, siteId);

    // Skip files inside _flowershow/ directory (matches worker behavior)
    if (filePath.includes('_flowershow/')) {
      console.log(`    [SKIP] ${filePath} — _flowershow/ directory`);
      skipped++;
      continue;
    }

    // Look up the blob ID — the worker uses this as the Typesense document ID
    const blobId = blobByPath.get(filePath);
    if (!blobId) {
      console.log(`    [SKIP] ${filePath} — no Blob record in database`);
      skipped++;
      continue;
    }

    try {
      const content = await fetchFileContent(key);
      if (!content) {
        console.log(`    [SKIP] ${filePath} — empty or not found in R2`);
        skipped++;
        continue;
      }

      // Parse frontmatter + extract title (mirrors worker's parseMarkdownFile)
      const { metadata, body } = parseMarkdownFile(content, filePath);

      // Skip files with publish: false (worker deletes these, we just skip)
      if (metadata.publish === false) {
        console.log(`    [SKIP] ${filePath} — publish: false`);
        skipped++;
        continue;
      }

      // Build document exactly as the worker does (worker.js lines 83-91)
      const document: Record<string, unknown> = {
        id: `${blobId}`,
        title: metadata.title,
        content: body,
        path: filePath,
        description: metadata.description,
        authors: metadata.authors,
        date: metadata.date ? new Date(metadata.date).getTime() / 1000 : null,
      };

      if (dryRun) {
        console.log(
          `    [DRY RUN] Would index: ${filePath} (blobId: ${blobId}, title: "${metadata.title}")`,
        );
        indexed++;
      } else {
        await typesense
          .collections(siteId)
          .documents()
          .upsert(document as any);
        console.log(`    [OK] ${filePath}`);
        indexed++;
      }
    } catch (error: any) {
      console.error(`    [ERROR] ${filePath}: ${error.message || error}`);
      errors++;
    }
  }

  return { indexed, skipped, errors, notFound: false };
}

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const siteIds = parseSiteIds(process.argv.slice(2));

  console.log('='.repeat(60));
  console.log('Reindex Site Content in Typesense from R2');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('DRY RUN MODE — no changes will be made\n');
  }

  if (siteIds.length === 0) {
    console.error('Error: No site IDs provided');
    console.log('\nUsage:');
    console.log(
      '  npx tsx scripts/reindex-site-typesense.ts <site-id1>,<site-id2>,...',
    );
    console.log(
      '  npx tsx scripts/reindex-site-typesense.ts <site-id1> <site-id2> ...',
    );
    console.log('\nOptions:');
    console.log('  DRY_RUN=true   Preview what would be indexed');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/reindex-site-typesense.ts clx1abc2def3');
    console.log(
      '  DRY_RUN=true npx tsx scripts/reindex-site-typesense.ts clx1abc2def3,clx4ghi5jkl6',
    );
    process.exit(1);
  }

  console.log(`Sites to reindex: ${siteIds.join(', ')}`);

  let totalIndexed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let notFoundCount = 0;

  for (const siteId of siteIds) {
    const result = await reindexSite(siteId, dryRun);
    totalIndexed += result.indexed;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
    if (result.notFound) notFoundCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Sites requested:    ${siteIds.length}`);
  console.log(`Sites not found:    ${notFoundCount}`);
  console.log(`Documents ${dryRun ? 'to index' : 'indexed'}:  ${totalIndexed}`);
  console.log(`Documents skipped:  ${totalSkipped}`);
  console.log(`Documents errored:  ${totalErrors}`);

  if (dryRun) {
    console.log(
      '\nThis was a dry run. Remove DRY_RUN=true to perform actual indexing.',
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
