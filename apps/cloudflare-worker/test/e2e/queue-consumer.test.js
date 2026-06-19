import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';

// ── Config ────────────────────────────────────────────────────────────────────

const DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/flowershow-dev';
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const S3_BUCKET = process.env.S3_BUCKET ?? 'flowershow';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID ?? 'minioadmin';
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY ?? 'minioadmin';

// Minimal 1×1 transparent PNG
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQ' +
    'AABjkB6QAAAABJRU5ErkJggg==',
  'base64',
);

// ── Shared state ──────────────────────────────────────────────────────────────

let worker;
let sql;
let s3;
let testUserId;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return `t${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

async function waitForPublish(publishId, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows =
      await sql`SELECT status FROM "Publish" WHERE id = ${publishId}`;
    const status = rows[0]?.status;
    if (status && status !== 'in_progress') {
      return status;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Publish ${publishId} did not complete within ${timeoutMs}ms`);
}

async function waitForBlob(siteId, path, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await sql`
      SELECT * FROM "Blob" WHERE site_id = ${siteId} AND path = ${path}
    `;
    if (rows.length > 0) return rows[0];
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Blob ${siteId}/${path} did not appear within ${timeoutMs}ms`);
}

async function waitForBlobDeletion(siteId, path, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await sql`
      SELECT id FROM "Blob" WHERE site_id = ${siteId} AND path = ${path}
    `;
    if (rows.length === 0) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Blob ${siteId}/${path} was not deleted within ${timeoutMs}ms`);
}

async function uploadToMinIO(key, body, publishId = null) {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body) : body,
      Metadata: publishId ? { 'publish-id': publishId } : {},
    }),
  );
}

async function deleteFromMinIO(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

async function triggerQueue(key, action = 'PutObject') {
  const eventName =
    action === 'DeleteObject'
      ? 's3:ObjectRemoved:Delete'
      : 's3:ObjectCreated:Put';
  const resp = await worker.fetch('http://localhost/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Records: [{ eventName, s3: { object: { key } } }] }),
  });
  if (!resp.ok) {
    throw new Error(`Queue trigger failed: ${resp.status} ${await resp.text()}`);
  }
}

async function seedSiteAndPublish(siteId, files) {
  const publishId = makeId();
  await sql`
    INSERT INTO "Site" (id, user_id, subdomain, project_name, updated_at)
    VALUES (${siteId}, ${testUserId}, ${siteId}, ${`project-${siteId}`}, NOW())
  `;
  await sql`
    INSERT INTO "Publish" (id, site_id, source, status, started_at)
    VALUES (${publishId}, ${siteId}, 'cli', 'in_progress', NOW())
  `;
  for (const { path, changeType = 'added' } of files) {
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES (${makeId()}, ${publishId}, ${path}, ${changeType}, 'uploading')
    `;
  }
  return publishId;
}

async function cleanupSite(siteId) {
  // Cascade: Site → Publish → PublishFile, Site → Blob
  await sql`DELETE FROM "Site" WHERE id = ${siteId}`;
}

// ── Suite setup ───────────────────────────────────────────────────────────────

beforeAll(async () => {
  worker = await unstable_dev('src/worker.js', {
    config: 'wrangler.flowershow.toml',
    env: 'dev',
    logLevel: 'error',
    experimental: { disableExperimentalWarning: true },
    vars: {
      DATABASE_URL: DB_URL,
      GITHUB_APP_ID: 'dummy',
      GITHUB_APP_PRIVATE_KEY: 'dummy',
      SYNC_TRIGGER_SECRET: 'test-secret',
      ENVIRONMENT: 'dev',
      S3_ENDPOINT,
      S3_BUCKET,
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: S3_ACCESS_KEY,
      S3_SECRET_ACCESS_KEY: S3_SECRET_KEY,
      S3_FORCE_PATH_STYLE: 'true',
    },
  });

  sql = postgres(DB_URL, { max: 2, fetch_types: false });

  s3 = new S3Client({
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    region: 'us-east-1',
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
  });

  testUserId = makeId();
  await sql`
    INSERT INTO "User" (id, username, updated_at)
    VALUES (${testUserId}, ${`user-${testUserId}`}, NOW())
  `;
}, 60_000);

afterAll(async () => {
  await sql`DELETE FROM "User" WHERE id = ${testUserId}`;
  await sql.end();
  await worker.stop();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('A — presigned happy path (markdown)', () => {
  const siteId = makeId();
  const path = 'notes/hello.md';
  const key = `${siteId}/main/raw/${path}`;
  const content = `---\ntitle: Hello World\n---\n\n# Hello\n\nSome content here.`;
  let publishId;

  beforeAll(async () => {
    publishId = await seedSiteAndPublish(siteId, [{ path }]);
    await uploadToMinIO(key, content, publishId);
    await triggerQueue(key);
  });

  afterAll(() => cleanupSite(siteId));

  it('finalizes Publish as success', async () => {
    const status = await waitForPublish(publishId);
    expect(status).toBe('success');
  });

  it('flips PublishFile to success', async () => {
    const rows = await sql`
      SELECT status FROM "PublishFile"
      WHERE publish_id = ${publishId} AND path = ${path}
    `;
    expect(rows[0]?.status).toBe('success');
  });

  it('creates Blob with sha, size, and metadata', async () => {
    const blob = await waitForBlob(siteId, path);
    expect(blob.sha).toBeTruthy();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.metadata?.title).toBe('Hello World');
  });
});

describe('B — publish:false frontmatter', () => {
  const siteId = makeId();
  const path = 'notes/hidden.md';
  const key = `${siteId}/main/raw/${path}`;
  const content = `---\npublish: false\ntitle: Hidden\n---\n\nShould not appear.`;
  let publishId;

  beforeAll(async () => {
    publishId = await seedSiteAndPublish(siteId, [{ path }]);
    await uploadToMinIO(key, content, publishId);
    await triggerQueue(key);
  });

  afterAll(() => cleanupSite(siteId));

  it('finalizes Publish as success', async () => {
    const status = await waitForPublish(publishId);
    expect(status).toBe('success');
  });

  it('flips PublishFile to success', async () => {
    const rows = await sql`
      SELECT status FROM "PublishFile"
      WHERE publish_id = ${publishId} AND path = ${path}
    `;
    expect(rows[0]?.status).toBe('success');
  });

  it('does not create a Blob for the suppressed file', async () => {
    // Give the consumer a moment to settle, then assert no blob
    await new Promise((r) => setTimeout(r, 500));
    const rows = await sql`
      SELECT id FROM "Blob" WHERE site_id = ${siteId} AND path = ${path}
    `;
    expect(rows).toHaveLength(0);
  });
});

describe('C — image file (dimensions extracted)', () => {
  const siteId = makeId();
  const path = 'assets/photo.png';
  const key = `${siteId}/main/raw/${path}`;
  let publishId;

  beforeAll(async () => {
    publishId = await seedSiteAndPublish(siteId, [{ path }]);
    await uploadToMinIO(key, MINIMAL_PNG, publishId);
    await triggerQueue(key);
  });

  afterAll(() => cleanupSite(siteId));

  it('finalizes Publish as success', async () => {
    const status = await waitForPublish(publishId);
    expect(status).toBe('success');
  });

  it('creates Blob with pixel dimensions', async () => {
    const blob = await waitForBlob(siteId, path);
    expect(blob.width).toBeGreaterThan(0);
    expect(blob.height).toBeGreaterThan(0);
    expect(blob.sha).toBeTruthy();
  });
});

describe('D — multi-file publish, atomic completion', () => {
  const siteId = makeId();
  const files = ['notes/a.md', 'notes/b.md', 'notes/c.md'];
  let publishId;

  beforeAll(async () => {
    publishId = await seedSiteAndPublish(
      siteId,
      files.map((path) => ({ path })),
    );
    await Promise.all(
      files.map(async (path) => {
        const key = `${siteId}/main/raw/${path}`;
        const content = `---\ntitle: ${path}\n---\n\nContent.`;
        await uploadToMinIO(key, content, publishId);
        await triggerQueue(key);
      }),
    );
  });

  afterAll(() => cleanupSite(siteId));

  it('finalizes Publish as success exactly once', async () => {
    const status = await waitForPublish(publishId);
    expect(status).toBe('success');

    const rows = await sql`
      SELECT completed_at FROM "Publish" WHERE id = ${publishId}
    `;
    expect(rows[0]?.completed_at).toBeTruthy();
  });

  it('marks all PublishFiles as success', async () => {
    const rows = await sql`
      SELECT status FROM "PublishFile" WHERE publish_id = ${publishId}
    `;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.status === 'success')).toBe(true);
  });

  it('creates a Blob for each file', async () => {
    await Promise.all(files.map((path) => waitForBlob(siteId, path)));
    const rows = await sql`
      SELECT id FROM "Blob" WHERE site_id = ${siteId}
    `;
    expect(rows).toHaveLength(3);
  });
});

describe('F — anonymous upload (no publishId in metadata)', () => {
  const siteId = makeId();
  const path = 'notes/anon.md';
  const key = `${siteId}/main/raw/${path}`;
  const content = `---\ntitle: Anon\n---\n\nAnonymous content.`;

  beforeAll(async () => {
    // Seed only the Site — no Publish or PublishFile
    await sql`
      INSERT INTO "Site" (id, user_id, subdomain, project_name, updated_at)
      VALUES (${siteId}, ${testUserId}, ${siteId}, ${`project-${siteId}`}, NOW())
    `;
    await uploadToMinIO(key, content); // no publishId
    await triggerQueue(key);
  });

  afterAll(() => cleanupSite(siteId));

  it('creates a Blob from the upload', async () => {
    const blob = await waitForBlob(siteId, path);
    expect(blob.sha).toBeTruthy();
    expect(blob.metadata?.title).toBe('Anon');
  });

  it('does not create any Publish record', async () => {
    const rows = await sql`SELECT id FROM "Publish" WHERE site_id = ${siteId}`;
    expect(rows).toHaveLength(0);
  });
});

describe('G — delete event removes Blob', () => {
  const siteId = makeId();
  const path = 'notes/to-delete.md';
  const key = `${siteId}/main/raw/${path}`;
  const content = `---\ntitle: Delete Me\n---\n\nGone soon.`;

  beforeAll(async () => {
    // Seed site and upload file so a Blob exists
    await sql`
      INSERT INTO "Site" (id, user_id, subdomain, project_name, updated_at)
      VALUES (${siteId}, ${testUserId}, ${siteId}, ${`project-${siteId}`}, NOW())
    `;
    await uploadToMinIO(key, content);
    await triggerQueue(key);
    // Wait for Blob to be created before triggering delete
    await waitForBlob(siteId, path);

    // Now delete from MinIO and trigger the delete queue event
    await deleteFromMinIO(key);
    await triggerQueue(key, 'DeleteObject');
  });

  afterAll(() => cleanupSite(siteId));

  it('removes the Blob from the database', async () => {
    await waitForBlobDeletion(siteId, path);
    const rows = await sql`
      SELECT id FROM "Blob" WHERE site_id = ${siteId} AND path = ${path}
    `;
    expect(rows).toHaveLength(0);
  });
});
