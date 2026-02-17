import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient, Status } from '@prisma/client';
import matter from 'gray-matter';

// --- Config ---

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

export const TEST_USER = {
  id: 'e2e-test-user-id',
  username: process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser',
  email: 'e2e-test@flowershow.app',
  name: 'E2E Test User',
};

export const TEST_SITE = {
  id: 'e2e-test-site-id',
  projectName: 'e2e-test-site',
};

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

// --- Seed ---

export async function seed(): Promise<void> {
  const db = getPrisma();
  const s3 = getS3Client();

  // 1. Upsert User
  await db.user.upsert({
    where: { id: TEST_USER.id },
    create: {
      id: TEST_USER.id,
      username: TEST_USER.username,
      email: TEST_USER.email,
      name: TEST_USER.name,
    },
    update: {
      username: TEST_USER.username,
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
  const files = listFiles(FIXTURES_DIR);

  for (const filePath of files) {
    const fullPath = path.join(FIXTURES_DIR, filePath);
    const content = fs.readFileSync(fullPath);
    const ext = path.extname(filePath).slice(1);
    const s3Key = `${TEST_SITE.id}/main/raw/${filePath}`;

    // Upload to S3/MinIO
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: content,
        ContentType: getContentType(ext),
      }),
    );

    // Compute metadata for markdown files
    const appPath = computeAppPath(filePath);
    let metadata: Record<string, unknown> = {};
    let permalink: string | null = null;

    if (['md', 'mdx'].includes(ext)) {
      const parsed = matter(content.toString());
      metadata = {
        title: parsed.data.title || null,
        description: parsed.data.description || null,
        date: parsed.data.date ? String(parsed.data.date) : null,
        authors: parsed.data.authors || null,
        image: parsed.data.image || null,
        publish: parsed.data.publish !== false,
        layout: parsed.data.layout || null,
      };
      permalink = parsed.data.permalink || null;
    }

    // Create Blob record
    const sha = crypto.createHash('sha1').update(content).digest('hex');

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
        syncStatus: 'SUCCESS' as Status,
      },
      update: {
        appPath,
        permalink,
        size: content.length,
        sha,
        metadata: metadata as any,
        extension: ext || null,
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
