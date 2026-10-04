/**
 * Backfill computed descriptions for pages published before the worker started
 * computing them (flowershow-1o5). For each markdown Blob whose metadata has no
 * description, fetch the file from storage, run extractDescription on the body,
 * and store { description, computed: [...existing, 'description'] }.
 *
 * Idempotent: blobs that already have a description are skipped.
 *
 * USAGE (from apps/flowershow; DATABASE_URL and S3_* env set):
 *   DRY_RUN=true npx tsx scripts/backfill-descriptions.ts
 *   npx tsx scripts/backfill-descriptions.ts
 *   SITE_ID=<id> npx tsx scripts/backfill-descriptions.ts   # one site
 *
 * Storage env: S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 * S3_BUCKET_NAME, optional S3_REGION, S3_FORCE_PATH_STYLE.
 */
import { pathToFileURL } from 'node:url';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extractDescription } from '@flowershow/core';
import { PrismaClient } from '@prisma/client';
import matter from 'gray-matter';

const PAGE_SIZE = 200;

/**
 * Pure per-blob decision. Returns the new metadata, or null when nothing
 * should change (no metadata, description already present, or no prose).
 * A description is missing when null/undefined or empty after trim.
 */
export function backfillMetadata(
  metadata: Record<string, unknown> | null,
  markdown: string,
): Record<string, unknown> | null {
  if (!metadata) return null;
  const existing = metadata.description;
  const missing =
    existing == null || (typeof existing === 'string' && !existing.trim());
  if (!missing) return null;

  const description = extractDescription(matter(markdown).content);
  if (!description) return null;

  const computed = Array.isArray(metadata.computed) ? metadata.computed : [];
  return {
    ...metadata,
    description,
    computed: [...new Set([...computed, 'description'])],
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const siteId = process.env.SITE_ID;

  const bucket = requireEnv('S3_BUCKET_NAME');
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: requireEnv('S3_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });
  const prisma = new PrismaClient();

  async function fetchText(key: string): Promise<string | null> {
    try {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      return (await res.Body?.transformToString()) ?? null;
    } catch (error: any) {
      if (error?.name === 'NoSuchKey') return null;
      throw error;
    }
  }

  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;
  let failed = 0;

  try {
    for (;;) {
      const blobs = await prisma.blob.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        where: {
          ...(siteId ? { siteId } : {}),
          OR: [{ path: { endsWith: '.md' } }, { path: { endsWith: '.mdx' } }],
        },
        select: { id: true, siteId: true, path: true, metadata: true },
      });
      if (blobs.length === 0) break;

      for (const blob of blobs) {
        cursor = blob.id;
        scanned++;
        const metadata = (blob.metadata ?? null) as Record<
          string,
          unknown
        > | null;
        if (!metadata) continue;
        const existing = metadata.description;
        if (
          !(
            existing == null ||
            (typeof existing === 'string' && !existing.trim())
          )
        )
          continue; // cheap skip before hitting storage

        try {
          const markdown = await fetchText(
            `${blob.siteId}/main/raw/${blob.path}`,
          );
          if (!markdown) continue;
          const next = backfillMetadata(metadata, markdown);
          if (!next) continue;

          if (dryRun) {
            console.log(
              `WOULD SET ${blob.siteId} ${blob.path}: ${next.description}`,
            );
          } else {
            await prisma.blob.update({
              where: { id: blob.id },
              data: { metadata: next as any },
            });
          }
          updated++;
        } catch (err) {
          failed++;
          console.error(`FAILED ${blob.siteId} ${blob.path}:`, err);
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    `Scanned ${scanned}, ${dryRun ? 'would update' : 'updated'} ${updated}, failed ${failed}.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
