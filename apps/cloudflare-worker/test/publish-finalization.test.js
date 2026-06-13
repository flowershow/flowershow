import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import postgres from 'postgres';
import {
  finalizePublishSuccess,
  finalizePublishTimeout,
} from '../src/publish-finalization.js';

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/flowershow-dev';

const TEST_USER_ID = 'test-finalization-user-tdd';
const TEST_SITE_ID = 'test-finalization-site-tdd';
const TEST_SUBDOMAIN = 'tdd-finalization-test';

let sql;

before(async () => {
  sql = postgres(TEST_DB_URL);
  await sql`
    INSERT INTO "User" (id, username, updated_at)
    VALUES (${TEST_USER_ID}, 'tdd-finalization-user', NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO "Site" (id, project_name, subdomain, user_id, updated_at)
    VALUES (${TEST_SITE_ID}, 'tdd-finalization-site', ${TEST_SUBDOMAIN}, ${TEST_USER_ID}, NOW())
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

describe('finalizePublishTimeout', () => {
  test('marks uploading PublishFile rows as expired', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-fin-010', ${TEST_SITE_ID}, 'cli', 'finalizing')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES
        ('tdd-fin-pf-001', 'tdd-fin-010', 'a.md', 'added', 'uploading'),
        ('tdd-fin-pf-002', 'tdd-fin-010', 'b.md', 'added', 'uploading'),
        ('tdd-fin-pf-003', 'tdd-fin-010', 'c.md', 'added', 'success')
    `;

    await finalizePublishTimeout(sql, 'tdd-fin-010');

    const files =
      await sql`SELECT path, status FROM "PublishFile" WHERE publish_id = 'tdd-fin-010' ORDER BY path`;
    assert.strictEqual(files[0].status, 'expired');  // a.md
    assert.strictEqual(files[1].status, 'expired');  // b.md
    assert.strictEqual(files[2].status, 'success');  // c.md — untouched
  });

  test('transitions finalizing → error and sets completedAt', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-fin-011', ${TEST_SITE_ID}, 'cli', 'finalizing')
    `;

    await finalizePublishTimeout(sql, 'tdd-fin-011');

    const [row] =
      await sql`SELECT status, completed_at FROM "Publish" WHERE id = 'tdd-fin-011'`;
    assert.strictEqual(row.status, 'error');
    assert.ok(row.completed_at instanceof Date, 'completedAt should be set');
  });

  test('is a no-op when already error (idempotent redelivery)', async () => {
    const fixedTime = new Date('2026-01-01T00:00:00Z');
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status, completed_at)
      VALUES ('tdd-fin-012', ${TEST_SITE_ID}, 'cli', 'error', ${fixedTime})
    `;

    await finalizePublishTimeout(sql, 'tdd-fin-012');

    const [row] =
      await sql`SELECT status, completed_at FROM "Publish" WHERE id = 'tdd-fin-012'`;
    assert.strictEqual(row.status, 'error');
    assert.strictEqual(
      row.completed_at.toISOString(),
      fixedTime.toISOString(),
      'completedAt should not be overwritten',
    );
  });
});

describe('finalizePublishSuccess', () => {
  test('transitions finalizing → success and sets completedAt', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-fin-001', ${TEST_SITE_ID}, 'cli', 'finalizing')
    `;

    await finalizePublishSuccess(sql, 'tdd-fin-001');

    const [row] =
      await sql`SELECT status, completed_at FROM "Publish" WHERE id = 'tdd-fin-001'`;
    assert.strictEqual(row.status, 'success');
    assert.ok(row.completed_at instanceof Date, 'completedAt should be set');
  });

  test('is a no-op when already success (idempotent redelivery)', async () => {
    const fixedTime = new Date('2026-01-01T00:00:00Z');
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status, completed_at)
      VALUES ('tdd-fin-002', ${TEST_SITE_ID}, 'cli', 'success', ${fixedTime})
    `;

    await finalizePublishSuccess(sql, 'tdd-fin-002');

    const [row] =
      await sql`SELECT status, completed_at FROM "Publish" WHERE id = 'tdd-fin-002'`;
    assert.strictEqual(row.status, 'success');
    assert.strictEqual(
      row.completed_at.toISOString(),
      fixedTime.toISOString(),
      'completedAt should not be overwritten',
    );
  });
});
