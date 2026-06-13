import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import postgres from 'postgres';
import {
  getBlobShaMap,
  upsertBlob,
  createPublishFilesUploading,
  createTerminalPublishFilesForDeletions,
} from '../src/github-sync-sql.js';

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/flowershow-dev';

const TEST_USER_ID = 'test-ghsql-user-tdd';
const TEST_SITE_ID = 'test-ghsql-site-tdd';
const TEST_SUBDOMAIN = 'tdd-ghsql-test';

let sql;

before(async () => {
  sql = postgres(TEST_DB_URL);
  await sql`
    INSERT INTO "User" (id, username, updated_at)
    VALUES (${TEST_USER_ID}, 'tdd-ghsql-user', NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO "Site" (id, project_name, subdomain, user_id, updated_at)
    VALUES (${TEST_SITE_ID}, 'tdd-ghsql-site', ${TEST_SUBDOMAIN}, ${TEST_USER_ID}, NOW())
    ON CONFLICT (id) DO NOTHING
  `;
});

after(async () => {
  await sql`DELETE FROM "Publish" WHERE site_id = ${TEST_SITE_ID}`;
  await sql`DELETE FROM "Blob" WHERE site_id = ${TEST_SITE_ID}`;
  await sql`DELETE FROM "Site" WHERE id = ${TEST_SITE_ID}`;
  await sql`DELETE FROM "User" WHERE id = ${TEST_USER_ID}`;
  await sql.end();
});

afterEach(async () => {
  await sql`DELETE FROM "Publish" WHERE site_id = ${TEST_SITE_ID}`;
  await sql`DELETE FROM "Blob" WHERE site_id = ${TEST_SITE_ID}`;
});

describe('getBlobShaMap', () => {
  test('returns a Map of path → sha for blobs belonging to the site', async () => {
    await sql`
      INSERT INTO "Blob" (id, site_id, path, sha, size, updated_at)
      VALUES
        ('tdd-ghblob-001', ${TEST_SITE_ID}, 'index.md', 'sha-abc', 100, NOW()),
        ('tdd-ghblob-002', ${TEST_SITE_ID}, 'page.md',  'sha-def', 200, NOW())
    `;

    const map = await getBlobShaMap(sql, TEST_SITE_ID);

    assert.strictEqual(map.size, 2);
    assert.strictEqual(map.get('index.md'), 'sha-abc');
    assert.strictEqual(map.get('page.md'), 'sha-def');
  });

  test('returns empty Map when site has no blobs', async () => {
    const map = await getBlobShaMap(sql, TEST_SITE_ID);
    assert.strictEqual(map.size, 0);
  });
});

describe('upsertBlob', () => {
  test('creates a new Blob row when it does not exist', async () => {
    await upsertBlob(sql, TEST_SITE_ID, {
      path: 'new.md',
      sha: 'sha-new',
      size: 512,
      appPath: '/new',
      extension: 'md',
    });

    const [row] = await sql`SELECT sha, size, app_path FROM "Blob" WHERE site_id = ${TEST_SITE_ID} AND path = 'new.md'`;
    assert.strictEqual(row.sha, 'sha-new');
    assert.strictEqual(row.size, 512);
    assert.strictEqual(row.app_path, '/new');
  });

  test('updates sha and size when Blob already exists', async () => {
    await sql`
      INSERT INTO "Blob" (id, site_id, path, sha, size, updated_at)
      VALUES ('tdd-ghblob-010', ${TEST_SITE_ID}, 'existing.md', 'sha-old', 100, NOW())
    `;

    await upsertBlob(sql, TEST_SITE_ID, {
      path: 'existing.md',
      sha: 'sha-new',
      size: 999,
      appPath: '/existing',
      extension: 'md',
    });

    const [row] = await sql`SELECT sha, size FROM "Blob" WHERE site_id = ${TEST_SITE_ID} AND path = 'existing.md'`;
    assert.strictEqual(row.sha, 'sha-new');
    assert.strictEqual(row.size, 999);
  });
});

describe('createPublishFilesUploading', () => {
  test('inserts PublishFile rows with status=uploading for each item', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-ghpub-001', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;

    await createPublishFilesUploading(sql, 'tdd-ghpub-001', [
      { filePath: 'a.md', changeType: 'added' },
      { filePath: 'b.md', changeType: 'updated' },
    ]);

    const files = await sql`
      SELECT path, change_type, status FROM "PublishFile"
      WHERE publish_id = 'tdd-ghpub-001'
      ORDER BY path
    `;
    assert.strictEqual(files.length, 2);
    assert.strictEqual(files[0].status, 'uploading');
    assert.strictEqual(files[0].path, 'a.md');
    assert.strictEqual(files[1].change_type, 'updated');
  });

  test('is a no-op for empty items array', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-ghpub-002', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;

    await createPublishFilesUploading(sql, 'tdd-ghpub-002', []);

    const files = await sql`SELECT * FROM "PublishFile" WHERE publish_id = 'tdd-ghpub-002'`;
    assert.strictEqual(files.length, 0);
  });
});

describe('createTerminalPublishFilesForDeletions', () => {
  test('inserts success rows for deleted paths and error rows for failed ones', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-ghpub-010', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;

    await createTerminalPublishFilesForDeletions(sql, 'tdd-ghpub-010', {
      deleted: ['a.md', 'b.md'],
      failed: ['c.md'],
    });

    const files = await sql`
      SELECT path, status FROM "PublishFile"
      WHERE publish_id = 'tdd-ghpub-010'
      ORDER BY path
    `;
    assert.strictEqual(files.length, 3);
    assert.strictEqual(files.find((f) => f.path === 'a.md').status, 'success');
    assert.strictEqual(files.find((f) => f.path === 'b.md').status, 'success');
    assert.strictEqual(files.find((f) => f.path === 'c.md').status, 'error');
  });

  test('all rows have changeType=deleted', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-ghpub-011', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;

    await createTerminalPublishFilesForDeletions(sql, 'tdd-ghpub-011', {
      deleted: ['x.md'],
      failed: [],
    });

    const [file] = await sql`SELECT change_type FROM "PublishFile" WHERE publish_id = 'tdd-ghpub-011'`;
    assert.strictEqual(file.change_type, 'deleted');
  });
});
