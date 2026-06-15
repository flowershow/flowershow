import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import postgres from 'postgres';
import {
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
  await sql`DELETE FROM "Site" WHERE id = ${TEST_SITE_ID}`;
  await sql`DELETE FROM "User" WHERE id = ${TEST_USER_ID}`;
  await sql.end();
});

afterEach(async () => {
  await sql`DELETE FROM "Publish" WHERE site_id = ${TEST_SITE_ID}`;
});

describe('createPublishFilesUploading', () => {
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
  test('maps deleted paths to success and failed paths to error', async () => {
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
});
