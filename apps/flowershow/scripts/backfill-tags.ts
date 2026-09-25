/**
 * Backfill the Tag table from existing Blob frontmatter tags.
 *
 * The Tag table (added in migration 20260925120000_add_tag_table) is populated
 * at publish time by the Cloudflare worker. Existing sites have an empty Tag
 * table until they re-publish, and the Bases plugin now reads tags from this
 * table instead of Blob.metadata — so without a backfill, previously-working
 * frontmatter-tag Bases filters silently return empty for every un-republished
 * site.
 *
 * Bases only ever saw *frontmatter* tags before this change, so backfilling
 * frontmatter tags (source: 'frontmatter') fully restores prior behavior.
 * Inline body `#tags` are a new capability and populate on the next publish.
 *
 * Idempotent: uses the same (blobId, tag) unique constraint as the worker via
 * skipDuplicates, so re-running only inserts missing rows.
 *
 * USAGE:
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
 */

import { frontmatterTags, tagIdentity } from '@flowershow/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === 'true';

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN MODE ===\n');
  }

  // Blobs whose frontmatter declares tags but have no Tag rows yet. Pull in
  // pages of blobs to avoid loading every blob's metadata into memory at once.
  const PAGE_SIZE = 500;
  let cursor: string | undefined;
  let scanned = 0;
  let blobsWithTags = 0;
  let rowsInserted = 0;

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
      const metadata = blob.metadata as Record<string, unknown> | null;
      const tags = frontmatterTags(metadata);
      if (tags.length === 0) continue;
      blobsWithTags++;

      // De-dupe by case-folded identity to respect the (blobId, identity) unique
      // key, keeping the first-seen display casing — matches mergePageTags.
      const byIdentity = new Map<string, string>();
      for (const tag of tags) {
        const id = tagIdentity(tag);
        if (id && !byIdentity.has(id)) byIdentity.set(id, tag);
      }
      const uniqueTags = [...byIdentity.entries()]; // [identity, displayTag]

      if (DRY_RUN) {
        console.log(
          `  WOULD INSERT: ${blob.path} → [${uniqueTags
            .map(([, tag]) => tag)
            .join(', ')}]`,
        );
        rowsInserted += uniqueTags.length;
        continue;
      }

      const result = await prisma.tag.createMany({
        data: uniqueTags.map(([identity, tag]) => ({
          siteId: blob.siteId,
          blobId: blob.id,
          tag,
          identity,
          source: 'frontmatter' as const,
        })),
        skipDuplicates: true,
      });
      rowsInserted += result.count;
    }

    console.log(`  …scanned ${scanned} blobs`);
  }

  console.log(
    `\nDone. Scanned ${scanned} blob(s), ${blobsWithTags} with frontmatter tags. ` +
      `${DRY_RUN ? 'Would insert' : 'Inserted'}: ${rowsInserted} Tag row(s).`,
  );
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
