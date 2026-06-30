import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { LinkType, Plan, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { filePathToSlug } from './file-path-to-slug';
import { extractImageDimensions, parseMarkdown } from './processing-utils';

// --- Config ---

const TEST_SITE_DIR = path.resolve(__dirname, '../fixtures/test-site');

export const TEST_USER = {
  id: 'e2e-test-user-id',
  username: 'test-user',
  email: 'e2e-test@flowershow.app',
  name: 'E2E Test User',
};

export const FREE_SITE = {
  id: 'e2e-test-site-id',
  projectName: 'e2e-test-site',
};

/** @deprecated use FREE_SITE_BASE_URL instead */
export const FREE_SITE_BASE_PATH = '';
export const FREE_SITE_SUBDOMAIN = `${FREE_SITE.projectName}-${TEST_USER.username}`;
export const FREE_SITE_BASE_URL = `http://${FREE_SITE_SUBDOMAIN}.${process.env.NEXT_PUBLIC_SITE_DOMAIN || 'localhost:3000'}`;

export const PREMIUM_SITE_CUSTOM_DOMAIN =
  process.env.E2E_CUSTOM_DOMAIN || 'e2e-premium.localhost:3000';

export const PREMIUM_SITE = {
  id: 'e2e-premium-site-id',
  projectName: 'e2e-premium-site',
  customDomain: PREMIUM_SITE_CUSTOM_DOMAIN,
};

export const PASSWORD_SITE = {
  id: 'e2e-password-site-id',
  projectName: 'e2e-password-site',
};
export const PASSWORD_SITE_PASSWORD = 'test-password-123';
export const PASSWORD_SITE_SUBDOMAIN = `${PASSWORD_SITE.projectName}-${TEST_USER.username}`;
export const PASSWORD_SITE_BASE_URL = `http://${PASSWORD_SITE_SUBDOMAIN}.${process.env.NEXT_PUBLIC_SITE_DOMAIN || 'localhost:3000'}`;

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

// --- Upload fixtures ---

async function uploadFixturesForSite(
  siteId: string,
  db: PrismaClient,
  s3: S3Client,
): Promise<void> {
  const files = listFiles(TEST_SITE_DIR);

  for (const filePath of files) {
    const fullPath = path.join(TEST_SITE_DIR, filePath);
    const content = fs.readFileSync(fullPath);
    const ext = path.extname(filePath).slice(1);
    const s3Key = `${siteId}/main/raw/${filePath}`;

    const appPath = ['md', 'mdx', 'canvas'].includes(ext)
      ? filePathToSlug(filePath)
      : null;
    let metadata: Record<string, unknown> = {};
    let permalink: string | null = null;
    let shouldPublish = true;

    if (['md', 'mdx'].includes(ext)) {
      const parsed = await parseMarkdown({
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
          siteId,
          path: filePath,
        },
      },
      create: {
        siteId,
        path: filePath,
        appPath,
        permalink,
        size: content.length,
        sha,
        metadata: metadata as any,
        extension: ext || null,
        width: dimensions.width,
        height: dimensions.height,
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
      },
    });
  }

  console.log(`Seeded ${files.length} files for site ${siteId}`);
}

// --- Backlink seeding ---

async function seedBacklinksForSite(
  siteId: string,
  db: PrismaClient,
): Promise<void> {
  const [targetBlob, source1Blob, source2Blob, source3Blob] = await Promise.all(
    [
      db.blob.findUnique({
        where: { siteId_path: { siteId, path: 'backlinks-target.md' } },
      }),
      db.blob.findUnique({
        where: { siteId_path: { siteId, path: 'backlinks-source-1.md' } },
      }),
      db.blob.findUnique({
        where: { siteId_path: { siteId, path: 'backlinks-source-2.md' } },
      }),
      db.blob.findUnique({
        where: { siteId_path: { siteId, path: 'backlinks-source-3.md' } },
      }),
    ],
  );

  if (!targetBlob || !source1Blob || !source2Blob || !source3Blob) {
    console.warn(
      `⚠️  seedBacklinksForSite(${siteId}): one or more blobs not found — skipping link creation`,
    );
    return;
  }

  // Delete any stale links for these (sourceBlobId, targetPath) pairs before
  // re-inserting with the correct targetBlobId. Using skipDuplicates would
  // silently keep old null-targetBlobId records when blobs are upserted with
  // the same IDs across seed runs.
  await db.link.deleteMany({
    where: {
      sourceBlobId: { in: [source1Blob.id, source2Blob.id, source3Blob.id] },
      targetPath: {
        in: ['backlinks-target', 'subfolder/../backlinks-target'],
      },
    },
  });

  await db.link.createMany({
    data: [
      {
        siteId,
        sourceBlobId: source1Blob.id,
        targetPath: 'backlinks-target',
        targetBlobId: targetBlob.id,
        linkType: LinkType.wikilink,
      },
      {
        siteId,
        sourceBlobId: source2Blob.id,
        targetPath: 'backlinks-target',
        targetBlobId: targetBlob.id,
        linkType: LinkType.wikilink,
      },
      // Two links from source3 to the same target via different paths —
      // reproduces the "doubled backlinks" bug (issue #1290).
      {
        siteId,
        sourceBlobId: source3Blob.id,
        targetPath: 'backlinks-target',
        targetBlobId: targetBlob.id,
        linkType: LinkType.wikilink,
      },
      {
        siteId,
        sourceBlobId: source3Blob.id,
        targetPath: 'subfolder/../backlinks-target',
        targetBlobId: targetBlob.id,
        linkType: LinkType.wikilink,
      },
    ],
  });
  console.log(`Seeded backlinks for site ${siteId}`);
}

// --- Cache invalidation ---

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'cloud.local:3000';

async function revalidateCache(): Promise<void> {
  const url = `http://${ROOT_DOMAIN}/api/internal/revalidate`;
  const secret = process.env.INTERNAL_API_SECRET;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-internal-secret': secret } : {}),
    },
    body: JSON.stringify({ tags: [FREE_SITE.id, PREMIUM_SITE.id] }),
  });
  if (!res.ok) {
    console.warn(`⚠️  Cache revalidation failed (${res.status}), continuing…`);
  }
}

export async function seed(): Promise<void> {
  const db = getPrisma();
  const s3 = getS3Client();

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

  // 2. Upsert Free Site
  await db.site.upsert({
    where: { id: FREE_SITE.id },
    create: {
      id: FREE_SITE.id,
      projectName: FREE_SITE.projectName,
      subdomain: `${FREE_SITE.projectName}-${TEST_USER.username}`,
      userId: TEST_USER.id,
      enableRss: true,
    },
    update: {
      projectName: FREE_SITE.projectName,
      subdomain: `${FREE_SITE.projectName}-${TEST_USER.username}`,
      enableRss: true,
    },
  });

  // 3. Upsert Premium Site (custom domain)
  await db.site.upsert({
    where: { id: PREMIUM_SITE.id },
    create: {
      id: PREMIUM_SITE.id,
      projectName: PREMIUM_SITE.projectName,
      subdomain: `${PREMIUM_SITE.projectName}-${TEST_USER.username}`,
      userId: TEST_USER.id,
      customDomain: PREMIUM_SITE.customDomain,
      plan: Plan.PREMIUM,
      enableRss: true,
    },
    update: {
      projectName: PREMIUM_SITE.projectName,
      subdomain: `${PREMIUM_SITE.projectName}-${TEST_USER.username}`,
      customDomain: PREMIUM_SITE.customDomain,
      plan: Plan.PREMIUM,
      enableRss: true,
    },
  });

  // 4. Upsert Password Site
  const accessPasswordHash = await bcrypt.hash(PASSWORD_SITE_PASSWORD, 10);
  await db.site.upsert({
    where: { id: PASSWORD_SITE.id },
    create: {
      id: PASSWORD_SITE.id,
      projectName: PASSWORD_SITE.projectName,
      subdomain: PASSWORD_SITE_SUBDOMAIN,
      userId: TEST_USER.id,
      privacyMode: 'PASSWORD',
      accessPasswordHash,
      tokenVersion: 1,
    },
    update: {
      projectName: PASSWORD_SITE.projectName,
      subdomain: PASSWORD_SITE_SUBDOMAIN,
      privacyMode: 'PASSWORD',
      accessPasswordHash,
      tokenVersion: 1,
    },
  });

  // 5. Upload fixtures to MinIO and create Blob records for all sites
  await uploadFixturesForSite(FREE_SITE.id, db, s3);
  await uploadFixturesForSite(PREMIUM_SITE.id, db, s3);
  await uploadFixturesForSite(PASSWORD_SITE.id, db, s3);

  // 6. Seed backlink Link records for backlinks e2e tests
  await seedBacklinksForSite(FREE_SITE.id, db);
  await seedBacklinksForSite(PREMIUM_SITE.id, db);

  // 7. Invalidate Next.js Data Cache after all data (including links) is in place
  await revalidateCache();
}

// --- Teardown ---

export async function teardown(): Promise<void> {
  const db = getPrisma();
  // Deleting the user cascades to sites and blobs
  await db.user.delete({ where: { id: TEST_USER.id } }).catch(() => {});
  await db.$disconnect();
}

// Allow running standalone: npx tsx e2e/helpers/seed.ts [teardown]
if (process.argv[1]?.endsWith('seed.ts')) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

  const fn = process.argv[2] === 'teardown' ? teardown : seed;
  fn()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
