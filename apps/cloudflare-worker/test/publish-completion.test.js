import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import postgres from 'postgres';
import { checkPublishCompletion } from '../src/publish-completion.js';

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/flowershow-dev';

const TEST_USER_ID = 'test-completion-user-tdd';
const TEST_SITE_ID = 'test-completion-site-tdd';
const TEST_SUBDOMAIN = 'tdd-completion-test';

let sql;

before(async () => {
  sql = postgres(TEST_DB_URL);
  await sql`
    INSERT INTO "User" (id, username, updated_at)
    VALUES (${TEST_USER_ID}, 'tdd-completion-user', NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO "Site" (id, project_name, subdomain, user_id, updated_at)
    VALUES (${TEST_SITE_ID}, 'tdd-completion-site', ${TEST_SUBDOMAIN}, ${TEST_USER_ID}, NOW())
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

describe('checkPublishCompletion', () => {
  test('returns false when publish is already finalizing (idempotent redelivery)', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-pub-003', ${TEST_SITE_ID}, 'cli', 'finalizing')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES ('tdd-pf-005', 'tdd-pub-003', 'index.md', 'added', 'success')
    `;

    const won = await checkPublishCompletion(sql, 'tdd-pub-003');

    assert.strictEqual(won, false);
  });

  test('counts error and canceled rows as terminal (only uploading blocks completion)', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-pub-004', ${TEST_SITE_ID}, 'cli', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES
        ('tdd-pf-006', 'tdd-pub-004', 'a.md', 'added', 'success'),
        ('tdd-pf-007', 'tdd-pub-004', 'b.md', 'added', 'error'),
        ('tdd-pf-008', 'tdd-pub-004', 'c.md', 'added', 'canceled')
    `;

    const won = await checkPublishCompletion(sql, 'tdd-pub-004');

    assert.strictEqual(won, true);
    const [row] = await sql`SELECT status FROM "Publish" WHERE id = 'tdd-pub-004'`;
    assert.strictEqual(row.status, 'finalizing');
  });

  test('exactly one winner under concurrent calls from two workers', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-pub-005', ${TEST_SITE_ID}, 'cli', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES ('tdd-pf-009', 'tdd-pub-005', 'index.md', 'added', 'success')
    `;

    const [won1, won2] = await Promise.all([
      checkPublishCompletion(sql, 'tdd-pub-005'),
      checkPublishCompletion(sql, 'tdd-pub-005'),
    ]);

    assert.strictEqual(won1 ^ won2, 1, 'exactly one of the two concurrent calls should win');
  });
});
