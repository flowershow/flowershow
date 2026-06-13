import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import postgres from 'postgres';
import { cleanupExpiredSites } from '../src/cleanup-expired-sites.js';

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/flowershow-dev';

const TEST_USER_ID = 'test-cleanup-sites-user-tdd';
const TEST_SITE_ID = 'test-cleanup-sites-site-tdd';
const TEST_SUBDOMAIN = 'tdd-cleanup-sites-test';

let sql;

function makeMockBucket(listedKeys = []) {
  const deletedKeys = [];
  return {
    deletedKeys,
    async list({ prefix } = {}) {
      const objects = listedKeys
        .filter((k) => !prefix || k.startsWith(prefix))
        .map((key) => ({ key }));
      return { objects, truncated: false };
    },
    async delete(keys) {
      const ks = Array.isArray(keys) ? keys : [keys];
      deletedKeys.push(...ks);
    },
  };
}

before(async () => {
  sql = postgres(TEST_DB_URL);
  await sql`
    INSERT INTO "User" (id, username, updated_at)
    VALUES (${TEST_USER_ID}, 'tdd-cleanup-sites-user', NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO "Site" (id, project_name, subdomain, user_id, updated_at)
    VALUES (${TEST_SITE_ID}, 'tdd-cleanup-sites-site', ${TEST_SUBDOMAIN}, ${TEST_USER_ID}, NOW())
    ON CONFLICT (id) DO NOTHING
  `;
});

after(async () => {
  await sql`DELETE FROM "Site" WHERE id LIKE 'test-cleanup-sites-%'`;
  await sql`DELETE FROM "User" WHERE id = ${TEST_USER_ID}`;
  await sql.end();
});

afterEach(async () => {
  // Re-insert or reset base site — it may have been deleted by the test under test
  await sql`
    INSERT INTO "Site" (id, project_name, subdomain, user_id, updated_at)
    VALUES (${TEST_SITE_ID}, 'tdd-cleanup-sites-site', ${TEST_SUBDOMAIN}, ${TEST_USER_ID}, NOW())
    ON CONFLICT (id) DO UPDATE SET is_temporary = false, expires_at = NULL
  `;
  await sql`DELETE FROM "Site" WHERE id LIKE 'test-cleanup-sites-extra-%'`;
});

describe('cleanupExpiredSites', () => {
  test('returns zero counts when no expired sites exist', async () => {
    const bucket = makeMockBucket();
    const result = await cleanupExpiredSites(sql, bucket, null);
    assert.deepStrictEqual(result, { deleted: 0, failed: 0, results: [] });
  });

  test('ignores non-temporary sites and sites with future expires_at', async () => {
    // permanent site
    await sql`UPDATE "Site" SET is_temporary = false, expires_at = NOW() - INTERVAL '1 hour' WHERE id = ${TEST_SITE_ID}`;
    // temporary but not yet expired
    await sql`
      INSERT INTO "Site" (id, project_name, subdomain, user_id, updated_at, is_temporary, expires_at)
      VALUES ('test-cleanup-sites-extra-future', 'future', 'tdd-cleanup-future', ${TEST_USER_ID}, NOW(), true, NOW() + INTERVAL '1 hour')
      ON CONFLICT (id) DO NOTHING
    `;
    const result = await cleanupExpiredSites(sql, makeMockBucket(), null);
    assert.deepStrictEqual(result, { deleted: 0, failed: 0, results: [] });
  });

  test('deletes expired temporary site from the database', async () => {
    await sql`
      UPDATE "Site" SET is_temporary = true, expires_at = NOW() - INTERVAL '1 hour'
      WHERE id = ${TEST_SITE_ID}
    `;
    await cleanupExpiredSites(sql, makeMockBucket(), null);
    const rows = await sql`SELECT id FROM "Site" WHERE id = ${TEST_SITE_ID}`;
    assert.strictEqual(rows.length, 0);
  });

  test('deletes R2 objects matching the site prefix', async () => {
    await sql`
      UPDATE "Site" SET is_temporary = true, expires_at = NOW() - INTERVAL '1 hour'
      WHERE id = ${TEST_SITE_ID}
    `;
    const bucket = makeMockBucket([
      `${TEST_SITE_ID}/main/raw/index.md`,
      `${TEST_SITE_ID}/main/raw/about.md`,
      'other-site/main/raw/index.md',
    ]);
    await cleanupExpiredSites(sql, bucket, null);
    assert.deepStrictEqual(bucket.deletedKeys.sort(), [
      `${TEST_SITE_ID}/main/raw/about.md`,
      `${TEST_SITE_ID}/main/raw/index.md`,
    ]);
  });

  test('calls typesense collection delete for expired site', async () => {
    await sql`
      UPDATE "Site" SET is_temporary = true, expires_at = NOW() - INTERVAL '1 hour'
      WHERE id = ${TEST_SITE_ID}
    `;
    const deletedCollections = [];
    const typesense = {
      collections: (id) => ({
        delete: async () => { deletedCollections.push(id); },
      }),
    };
    await cleanupExpiredSites(sql, makeMockBucket(), typesense);
    assert.deepStrictEqual(deletedCollections, [TEST_SITE_ID]);
  });

  test('returns correct deleted count', async () => {
    await sql`
      UPDATE "Site" SET is_temporary = true, expires_at = NOW() - INTERVAL '1 hour'
      WHERE id = ${TEST_SITE_ID}
    `;
    const result = await cleanupExpiredSites(sql, makeMockBucket(), null);
    assert.strictEqual(result.deleted, 1);
    assert.strictEqual(result.failed, 0);
    assert.deepStrictEqual(result.results, [{ siteId: TEST_SITE_ID, status: 'deleted' }]);
  });
});
