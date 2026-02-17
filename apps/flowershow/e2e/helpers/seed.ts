import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaClient, Status } from '@prisma/client';
import {
  extractImageDimensions,
  parseMarkdownForSync,
} from '../../../../packages/cloudflare-worker/src/processing-utils.js';

// --- Config ---

const TEST_SITE_DIR = path.resolve(__dirname, '../fixtures/test-site');

export const TEST_USER = {
  id: 'e2e-test-user-id',
  username: 'test-user',
  email: 'e2e-test@flowershow.app',
  name: 'E2E Test User',
};

export const TEST_SITE = {
  id: 'e2e-test-site-id',
  projectName: 'e2e-test-site',
};

/** URL prefix shared by every spec file: /@username/project */
export const BASE_PATH = `/@${TEST_USER.username}/${TEST_SITE.projectName}`;

// --- Prisma ---

let prisma: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

// --- S3 / MinIO ---

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  });
}

const BUCKET = process.env.S3_BUCKET_NAME || 'flowershow';

// --- Helpers ---

/** Compute appPath from a file path (mirrors Inngest sync logic) */
function computeAppPath(filePath: string): string | null {
  const ext = path.extname(filePath).slice(1);
  if (!['md', 'mdx'].includes(ext)) return null;

  const urlPath = filePath
    .replace(/\.(md|mdx)$/, '') // strip extension
    .replace(/\/(index|README)$/, '') // strip trailing index/README
    .replace(/^(index|README)$/, ''); // root index/README → empty

  // Root becomes '/'
  if (urlPath === '') return '/';

  // Other paths have no leading slash (matching Inngest behavior)
  return urlPath.replace(/^\//, '');
}

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    md: 'text/markdown',
    mdx: 'text/markdown',
    json: 'application/json',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    avif: 'image/avif',
  };
  return map[ext] || 'application/octet-stream';
}

/** Recursively list all files in a directory */
function listFiles(dir: string, base = ''): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFiles(path.join(dir, entry.name), rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

// --- Preflight checks ---

async function checkPostgres(db: PrismaClient): Promise<void> {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (err) {
    const pgUrl = process.env.POSTGRES_PRISMA_URL ?? '(not set in environment)';
    throw new Error(
      `PostgreSQL is not reachable.\n` +
        `  POSTGRES_PRISMA_URL: ${pgUrl}\n` +
        `  Make sure the database is running (e.g. "brew services start postgresql").\n` +
        `  Original error: ${err instanceof Error ? err.message : err}`,
    );
  }
}

async function checkMinIO(s3: S3Client): Promise<void> {
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch (err: any) {
    // HeadBucket can throw for missing bucket vs unreachable service.
    // A "NotFound" or "403" means the service IS reachable (bucket issue).
    // A network-level error means the service is down.
    const code = err?.name ?? err?.Code ?? '';
    if (['NotFound', 'NoSuchBucket'].includes(code)) {
      throw new Error(
        `MinIO is running but bucket "${BUCKET}" does not exist.\n` +
          `  Create it with: mc mb local/${BUCKET}\n` +
          `  Original error: ${err.message}`,
      );
    }
    // 403 / AccessDenied means the service is up (auth issue or bucket exists)
    if (code === 'AccessDenied' || err?.$metadata?.httpStatusCode === 403) {
      return; // service is reachable, bucket likely exists
    }
    throw new Error(
      `MinIO / S3 is not reachable at ${endpoint}.\n` +
        `  Make sure MinIO is running (e.g. "minio server ~/data").\n` +
        `  Original error: ${err instanceof Error ? err.message : err}`,
    );
  }
}

// --- Seed ---

// --- Cache invalidation ---

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'my.flowershow.local:3000';

async function revalidateCache(): Promise<void> {
  const url = `http://${ROOT_DOMAIN}/api/e2e/revalidate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: [TEST_SITE.id] }),
  });
  if (!res.ok) {
    console.warn(`⚠️  Cache revalidation failed (${res.status}), continuing…`);
  }
}

export async function seed(): Promise<void> {
  const db = getPrisma();
  const s3 = getS3Client();

  // Preflight: fail fast with clear messages if services are down
  // Invalidate any stale Next.js Data Cache entries for this site
  await revalidateCache();

  await checkPostgres(db);
  await checkMinIO(s3);

  // 1. Clean up any existing user with the same username (in case of leftover data from previous runs)
  await db.user
    .deleteMany({
      where: {
        OR: [{ id: TEST_USER.id }, { username: TEST_USER.username }],
      },
    })
    .catch(() => {});

  // 2. Create User
  await db.user.create({
    data: {
      id: TEST_USER.id,
      username: TEST_USER.username,
      email: TEST_USER.email,
      name: TEST_USER.name,
    },
  });

  // 2. Upsert Site
  await db.site.upsert({
    where: { id: TEST_SITE.id },
    create: {
      id: TEST_SITE.id,
      projectName: TEST_SITE.projectName,
      userId: TEST_USER.id,
    },
    update: {
      projectName: TEST_SITE.projectName,
    },
  });

  // 3. Upload fixtures to MinIO and create Blob records
  const files = listFiles(TEST_SITE_DIR);

  for (const filePath of files) {
    const fullPath = path.join(TEST_SITE_DIR, filePath);
    const content = fs.readFileSync(fullPath);
    const ext = path.extname(filePath).slice(1);
    const s3Key = `${TEST_SITE.id}/main/raw/${filePath}`;

    // Compute metadata for markdown files
    const appPath = computeAppPath(filePath);
    let metadata: Record<string, unknown> = {};
    let permalink: string | null = null;
    let shouldPublish = true;

    if (['md', 'mdx'].includes(ext)) {
      const parsed = await parseMarkdownForSync({
        markdown: content.toString(),
        path: filePath,
      });

      metadata = parsed.metadata;
      permalink = parsed.permalink;
      shouldPublish = parsed.shouldPublish;
    }

    if (!shouldPublish) {
      continue;
    }

    // Upload to S3/MinIO
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: content,
        ContentType: getContentType(ext),
      }),
    );

    // Create Blob record
    const sha = crypto.createHash('sha1').update(content).digest('hex');
    const dimensions = extractImageDimensions(filePath, content);

    await db.blob.upsert({
      where: {
        siteId_path: {
          siteId: TEST_SITE.id,
          path: filePath,
        },
      },
      create: {
        siteId: TEST_SITE.id,
        path: filePath,
        appPath,
        permalink,
        size: content.length,
        sha,
        metadata: metadata as any,
        extension: ext || null,
        width: dimensions.width,
        height: dimensions.height,
        syncStatus: 'SUCCESS' as Status,
      },
      update: {
        appPath,
        permalink,
        size: content.length,
        sha,
        metadata: metadata as any,
        extension: ext || null,
        width: dimensions.width,
        height: dimensions.height,
        syncStatus: 'SUCCESS' as Status,
      },
    });
  }

  console.log(`Seeded ${files.length} files for site ${TEST_SITE.id}`);
}

// --- Teardown ---

export async function teardown(): Promise<void> {
  const db = getPrisma();
  // Deleting the user cascades to sites and blobs
  await db.user.delete({ where: { id: TEST_USER.id } }).catch(() => {});
  await db.$disconnect();
}
