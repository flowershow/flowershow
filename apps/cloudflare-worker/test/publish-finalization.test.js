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
