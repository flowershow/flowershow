/**
 * Reindex Site Content in Typesense
 *
 * Rebuilds the search documents of a site's markdown pages, for pages that
 * never made it into search (e.g. the worker's indexing failed, the site
 * predates its collection, or Typesense rejected a document the worker now
 * accepts, like `authors: Ada`).
 *
 * Each document is built the way the worker builds it (indexInTypesense in
 * cloudflare-worker/src/queue-consumer.js), from:
 *   - the Blob row's metadata, which the worker stored after parsing the
 *     frontmatter and computing title/description, and
 *   - the page body, read from R2 ({siteId}/main/raw/{path}).
 * Drafts are not indexed, and an earlier document of a draft is deleted.
 * Upserts only: documents of other pages are left alone (see
 * cleanup-typesense-orphans.ts for removing stale ones).
 *
 * USAGE:
 *
 *   # Reindex sites (comma or space separated):
 *   npx tsx scripts/reindex-site-typesense.ts site1,site2 site3
 *
 *   # Dry run (preview what would be indexed):
 *   DRY_RUN=true npx tsx scripts/reindex-site-typesense.ts <site-id>
 *
 * REQUIREMENTS:
 *   - Run from the flowershow directory
 *   - Env: database (POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING), S3/R2
 *     (S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME) and
 *     Typesense (TYPESENSE_ADMIN_API_KEY or a key with documents:create,
 *     documents:delete and collections:create; NEXT_PUBLIC_TYPESENSE_HOST,
 *     _PORT, _PROTOCOL)
 */

import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import {
  extractInlineTags,
  frontmatterTags,
  isDraft,
  mergePageTags,
  normalizeAuthors,
} from '@flowershow/core';
import { PrismaClient } from '@prisma/client';
import matter from 'gray-matter';
import { Client as TypesenseClient } from 'typesense';
import type { ImportResponse } from 'typesense/lib/Typesense/Documents';
import {
  ImportError,
  ObjectAlreadyExists,
  ObjectNotFound,
} from 'typesense/lib/Typesense/Errors';

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

const FETCH_CONCURRENCY = 16;
const IMPORT_BATCH_SIZE = 100;

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
  connectionTimeoutSeconds: 30,
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
    { name: 'tags', type: 'string[]' as const, facet: true, optional: true },
  ],
};

// ---------------------------------------------------------------------------
// Document building (mirrors cloudflare-worker/src/queue-consumer.js)
// ---------------------------------------------------------------------------

// A leading `---` ... `---` block, for stripping frontmatter gray-matter can't parse.
const FRONTMATTER_BLOCK =
  /^\uFEFF?---[^\n]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

/** Page body without frontmatter (worker: splitFrontmatter). */
function bodyOf(markdown: string): string {
  try {
    return matter(markdown, {}).content;
  } catch {
    const block = markdown.match(FRONTMATTER_BLOCK)?.[0] ?? '';
    return markdown.slice(block.length);
  }
}

/** Worker: getUnixTimestamp. Whole seconds: the field is int64. */
function unixTimestamp(value: unknown): number | null {
  if (value == null || value === '') return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime())
    ? null
    : Math.floor(date.getTime() / 1000);
}

/** Worker: extractTitle, the first `# heading` without markdown formatting. */
function extractTitle(body: string): string | null {
  const heading = body.trim().match(/^#{1}[ ]+(.*)/);
  if (!heading?.[1]) return null;
  return heading[1]
    .replace(/\[\[([\S\s]*?)]]/, '$1')
    .replace(/[_*~`>]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim();
}

/** Blob.metadata is JSON; the worker always stores an object. */
function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Worker: indexInTypesense (document) with extractTags. */
function buildDocument(
  blobId: string,
  path: string,
  metadata: Record<string, unknown>,
  body: string,
) {
  const tags = mergePageTags(
    frontmatterTags(metadata),
    extractInlineTags(body),
  );
  return {
    // Blobs stored before the worker kept its computed title have none:
    // compute it as the worker's parseMarkdown does
    title:
      metadata.title ||
      extractTitle(body) ||
      path
        .split('/')
        .pop()
        ?.replace(/\.(mdx|md)$/, '') ||
      '',
    content: body,
    path,
    description: metadata.description,
    authors: normalizeAuthors(metadata.authors),
    date: unixTimestamp(metadata.date),
    tags: tags.map((t) => t.tag),
    id: blobId,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSiteIds(args: string[]): string[] {
  return args
    .join(' ')
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/** Fetch a file's content from R2 as a string; null when it isn't there. */
async function fetchFileContent(key: string): Promise<string | null> {
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }),
    );
    return (await response.Body?.transformToString()) ?? null;
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

/** Run `fn` over `items` with at most `limit` in flight. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]!);
      }
    }),
  );
  return results;
}

/** Ensure a Typesense collection exists for the site, creating it if needed. */
async function ensureCollection(siteId: string): Promise<void> {
  try {
    await typesense
      .collections()
      .create({ name: siteId, ...siteCollectionSchema });
    console.log(`  Created Typesense collection`);
  } catch (error) {
    if (!(error instanceof ObjectAlreadyExists)) throw error;
  }
}

/** Upsert documents in batches; returns per-document failures. */
async function importDocuments(
  siteId: string,
  documents: Record<string, unknown>[],
): Promise<{ id: string; error: string }[]> {
  const failures: { id: string; error: string }[] = [];
  for (let i = 0; i < documents.length; i += IMPORT_BATCH_SIZE) {
    const batch = documents.slice(i, i + IMPORT_BATCH_SIZE);
    let results: ImportResponse[];
    try {
      results = await typesense
        .collections(siteId)
        .documents()
        .import(batch, { action: 'upsert' });
    } catch (error) {
      // typesense-js throws ImportError when any document in the batch fails
      if (!(error instanceof ImportError)) throw error;
      results = error.importResults;
    }
    results.forEach((result, j) => {
      if (!result.success) {
        failures.push({
          id: String(batch[j]!.id),
          error: result.error ?? 'unknown error',
        });
      }
    });
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type SiteResult = {
  indexed: number;
  drafts: number;
  notInR2: number;
  failed: number;
  notFound: boolean;
};

async function reindexSite(
  siteId: string,
  dryRun: boolean,
): Promise<SiteResult> {
  const result: SiteResult = {
    indexed: 0,
    drafts: 0,
    notInR2: 0,
    failed: 0,
    notFound: false,
  };

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { projectName: true, user: { select: { ghUsername: true } } },
  });
  if (!site) {
    console.log(`\n${siteId}: site not found, skipping`);
    return { ...result, notFound: true };
  }
  console.log(
    `\n${siteId} (${site.user?.ghUsername ?? 'unknown'}/${site.projectName})`,
  );

  // The worker indexes every .md/.mdx page with a Blob row
  const blobs = await prisma.blob.findMany({
    where: { siteId, path: { endsWith: '.md' } },
    select: { id: true, path: true, metadata: true },
  });
  blobs.push(
    ...(await prisma.blob.findMany({
      where: { siteId, path: { endsWith: '.mdx' } },
      select: { id: true, path: true, metadata: true },
    })),
  );

  const draftIds = blobs.filter((b) => isDraft(b.metadata)).map((b) => b.id);
  const pages = blobs.filter((b) => !isDraft(b.metadata));
  result.drafts = draftIds.length;

  const built = await mapPool(pages, FETCH_CONCURRENCY, async (blob) => {
    const markdown = await fetchFileContent(`${siteId}/main/raw/${blob.path}`);
    if (markdown == null) {
      console.log(`    [SKIP] ${blob.path}: not in R2`);
      return null;
    }
    return buildDocument(
      blob.id,
      blob.path,
      asRecord(blob.metadata),
      bodyOf(markdown),
    );
  });
  const documents = built.filter((d) => d !== null);
  result.notInR2 = pages.length - documents.length;

  if (dryRun) {
    result.indexed = documents.length;
    console.log(
      `  [DRY RUN] would index ${documents.length}, remove ${draftIds.length} draft(s); ${result.notInR2} not in R2`,
    );
    return result;
  }

  if (documents.length > 0) {
    await ensureCollection(siteId);
    const failures = await importDocuments(siteId, documents);
    const pathById = new Map(pages.map((p) => [p.id, p.path]));
    for (const f of failures) {
      console.log(`    [FAIL] ${pathById.get(f.id)}: ${f.error}`);
    }
    result.failed = failures.length;
    result.indexed = documents.length - failures.length;
  }
  for (const id of draftIds) {
    try {
      await typesense.collections(siteId).documents(id).delete();
    } catch (error) {
      if (!(error instanceof ObjectNotFound)) throw error; // else: not indexed
    }
  }
  console.log(
    `  indexed ${result.indexed}, failed ${result.failed}, drafts ${result.drafts}, not in R2 ${result.notInR2}`,
  );
  return result;
}

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const siteIds = parseSiteIds(process.argv.slice(2));

  if (siteIds.length === 0) {
    console.error('Error: No site IDs provided');
    console.log(
      '\nUsage: [DRY_RUN=true] npx tsx scripts/reindex-site-typesense.ts <site-id1>,<site-id2> ...',
    );
    process.exit(1);
  }

  console.log(
    `Reindexing ${siteIds.length} site(s) in Typesense${dryRun ? ' (DRY RUN)' : ''}`,
  );

  const total = { indexed: 0, drafts: 0, notInR2: 0, failed: 0, notFound: 0 };
  for (const siteId of siteIds) {
    const r = await reindexSite(siteId, dryRun);
    total.indexed += r.indexed;
    total.drafts += r.drafts;
    total.notInR2 += r.notInR2;
    total.failed += r.failed;
    if (r.notFound) total.notFound++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(
    `Sites:              ${siteIds.length} (${total.notFound} not found)`,
  );
  console.log(
    `Documents ${dryRun ? 'to index' : 'indexed'}:  ${total.indexed}`,
  );
  console.log(`Documents failed:   ${total.failed}`);
  console.log(`Drafts skipped:     ${total.drafts}`);
  console.log(`Not in R2:          ${total.notInR2}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('\nScript failed with error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
