/**
 * Backfill the Tag table from existing content (frontmatter + inline body tags).
 *
 * The Tag table (added in migration 20260925120000_add_tag_table) is populated
 * at publish time by the Cloudflare worker's `syncTags`. Existing sites have an
 * empty Tag table until they re-publish, so `/tags` navigation, tag counts, and
 * Bases tag filters silently return empty for every un-republished site.
 *
 * This backfill reproduces the worker's `extractTags(body, metadata)` for every
 * already-published markdown blob WITHOUT requiring a republish:
 *   - **frontmatter tags** come from the Blob's stored `metadata` (JSONB), and
 *   - **inline body `#tags`** are parsed from the raw markdown fetched from R2
 *     (`${siteId}/main/raw/${path}` — the same key the app's /api/raw route and
 *     lib/content-store use), frontmatter-stripped with gray-matter.
 * Both are merged via `mergePageTags`, exactly as the worker does, so the two
 * paths can't drift.
 *
 * Idempotent: inserts via the (blobId, identity) unique constraint with
 * skipDuplicates, so re-running only adds missing rows. It is insert-only — it
 * does not delete rows that no longer match the file (a full republish, which
 * runs the worker's reconciling `syncTags`, is the way to prune stale tags).
 *
 * USAGE (from the apps/flowershow directory):
 *
 *   # Backfill all sites:
 *   npx tsx scripts/backfill-tags.ts
 *
 *   # Dry run (preview what would be inserted):
 *   DRY_RUN=true npx tsx scripts/backfill-tags.ts
 *
 * REQUIREMENTS:
 *   - Run from the apps/flowershow directory
 *   - DATABASE_URL set in environment
 *   - S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME,
 *     S3_REGION, and (optionally) S3_FORCE_PATH_STYLE set in environment — the
 *     same content-store credentials the app uses to read blob bodies from R2.
 */

import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import {
  extractInlineTags,
  frontmatterTags,
  mergePageTags,
  tagIdentity,
} from '@flowershow/core';
import { PrismaClient } from '@prisma/client';
import matter from 'gray-matter';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === 'true';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Mirror lib/content-store's S3 client so we read blob bodies from the same
// bucket/key layout the app itself uses.
const s3Bucket = requireEnv('S3_BUCKET_NAME');
const s3Client = new S3Client({
  region: requireEnv('S3_REGION'),
  endpoint: requireEnv('S3_ENDPOINT'),
  credentials: {
    accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const MARKDOWN_EXTENSION = /\.(md|mdx)$/i;

/**
 * Fetch a blob's raw markdown from R2. Returns null when the object is missing
 * (e.g. deleted from storage but still in the DB) so the caller can fall back to
 * frontmatter-only tags.
 */
async function fetchBody(siteId: string, path: string): Promise<string | null> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: `${siteId}/main/raw/${path}`,
      }),
    );
    return (await response.Body?.transformToString()) ?? null;
  } catch (err) {
    if (err instanceof NoSuchKey) return null;
    throw err;
  }
}

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN MODE ===\n');
  }

  // Page through markdown blobs to avoid loading every blob into memory at once.
  const PAGE_SIZE = 500;
  let cursor: string | undefined;
  let scanned = 0;
  let blobsWithTags = 0;
  let rowsInserted = 0;
  let bodiesMissing = 0;

  for (;;) {
    const blobs = await prisma.blob.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true, siteId: true, path: true, metadata: true },
    });
    if (blobs.length === 0) break;
    scanned += blobs.length;

    for (const blob of blobs) {
      cursor = blob.id;

      // Only markdown pages carry tags. Non-markdown blobs (images, etc.) never
      // do, so skip the R2 round-trip for them.
      if (!MARKDOWN_EXTENSION.test(blob.path)) continue;

      const metadata = blob.metadata as Record<string, unknown> | null;

      // Inline `#tags` live in the body; fetch the raw markdown from R2. If the
      // object is gone, fall back to frontmatter-only tags from stored metadata.
      const markdown = await fetchBody(blob.siteId, blob.path);
      if (markdown === null) bodiesMissing++;
      const body = markdown === null ? '' : matter(markdown).content;

      // Same canonical tag set the worker computes in extractTags(body, metadata):
      // union of frontmatter + inline, deduped by case-folded identity, first-seen
      // casing, frontmatter winning the source on a tie.
      const tags = mergePageTags(
        frontmatterTags(metadata),
        extractInlineTags(body),
      );
      if (tags.length === 0) continue;
      blobsWithTags++;

      if (DRY_RUN) {
        console.log(
          `  WOULD INSERT: ${blob.path} → [${tags
            .map((t) => `${t.tag} (${t.source})`)
            .join(', ')}]`,
        );
        rowsInserted += tags.length;
        continue;
      }

      const result = await prisma.tag.createMany({
        data: tags.map((t) => ({
          siteId: blob.siteId,
          blobId: blob.id,
          tag: t.tag,
          identity: tagIdentity(t.tag),
          source: t.source,
        })),
        skipDuplicates: true,
      });
      rowsInserted += result.count;
    }

    console.log(`  …scanned ${scanned} blobs`);
  }

  console.log(
    `\nDone. Scanned ${scanned} blob(s), ${blobsWithTags} with tags. ` +
      `${DRY_RUN ? 'Would insert' : 'Inserted'}: ${rowsInserted} Tag row(s).` +
      (bodiesMissing > 0
        ? ` ${bodiesMissing} markdown blob(s) had no R2 body (frontmatter-only fallback).`
        : ''),
  );
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
