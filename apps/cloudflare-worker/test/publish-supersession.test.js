import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import postgres from 'postgres';
import {
  cancelSupersededGithubPublish,
  cancelPublishFilesForPaths,
} from '../src/publish-supersession.js';
import { checkPublishCompletion } from '../src/publish-completion.js';

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/flowershow-dev';

const TEST_USER_ID = 'test-supersession-user-tdd';
const TEST_SITE_ID = 'test-supersession-site-tdd';
const TEST_SUBDOMAIN = 'tdd-supersession-test';

let sql;

before(async () => {
  sql = postgres(TEST_DB_URL);
  await sql`
    INSERT INTO "User" (id, username, updated_at)
    VALUES (${TEST_USER_ID}, 'tdd-supersession-user', NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO "Site" (id, project_name, subdomain, user_id, updated_at)
    VALUES (${TEST_SITE_ID}, 'tdd-supersession-site', ${TEST_SUBDOMAIN}, ${TEST_USER_ID}, NOW())
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

describe('cancelSupersededGithubPublish', () => {
  test('cancels uploading files of prior github_webhook publish and returns its id', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-001', ${TEST_SITE_ID}, 'github_webhook', 'in_progress'),
        ('tdd-sup-002', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES ('tdd-sup-pf-001', 'tdd-sup-001', 'index.md', 'added', 'uploading')
    `;

    const affected = await cancelSupersededGithubPublish(sql, TEST_SITE_ID, 'tdd-sup-002');

    assert.deepStrictEqual(affected.sort(), ['tdd-sup-001']);
    const [file] = await sql`SELECT status FROM "PublishFile" WHERE id = 'tdd-sup-pf-001'`;
    assert.strictEqual(file.status, 'canceled');
  });

  test('returns empty array when no prior in-progress github_webhook publish', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-sup-010', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;

    const affected = await cancelSupersededGithubPublish(sql, TEST_SITE_ID, 'tdd-sup-010');

    assert.deepStrictEqual(affected, []);
  });

  test('does not touch already-terminal files', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-020', ${TEST_SITE_ID}, 'github_webhook', 'in_progress'),
        ('tdd-sup-021', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES
        ('tdd-sup-pf-020', 'tdd-sup-020', 'a.md', 'added', 'success'),
        ('tdd-sup-pf-021', 'tdd-sup-020', 'b.md', 'added', 'error'),
        ('tdd-sup-pf-022', 'tdd-sup-020', 'c.md', 'added', 'uploading')
    `;

    await cancelSupersededGithubPublish(sql, TEST_SITE_ID, 'tdd-sup-021');

    const files = await sql`
      SELECT id, status FROM "PublishFile"
      WHERE publish_id = 'tdd-sup-020'
      ORDER BY id
    `;
    assert.strictEqual(files[0].status, 'success');  // unchanged
    assert.strictEqual(files[1].status, 'error');    // unchanged
    assert.strictEqual(files[2].status, 'canceled'); // was uploading → canceled
  });

  test('does not touch the new publish own files', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-030', ${TEST_SITE_ID}, 'github_webhook', 'in_progress'),
        ('tdd-sup-031', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES
        ('tdd-sup-pf-030', 'tdd-sup-030', 'a.md', 'added', 'uploading'),
        ('tdd-sup-pf-031', 'tdd-sup-031', 'a.md', 'added', 'uploading')
    `;

    await cancelSupersededGithubPublish(sql, TEST_SITE_ID, 'tdd-sup-031');

    const [newFile] = await sql`SELECT status FROM "PublishFile" WHERE id = 'tdd-sup-pf-031'`;
    assert.strictEqual(newFile.status, 'uploading');
  });

  test('handles multiple prior in-progress github_webhook publishes', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-040', ${TEST_SITE_ID}, 'github_webhook', 'in_progress'),
        ('tdd-sup-041', ${TEST_SITE_ID}, 'github_webhook', 'in_progress'),
        ('tdd-sup-042', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES
        ('tdd-sup-pf-040', 'tdd-sup-040', 'a.md', 'added', 'uploading'),
        ('tdd-sup-pf-041', 'tdd-sup-041', 'b.md', 'added', 'uploading')
    `;

    const affected = await cancelSupersededGithubPublish(sql, TEST_SITE_ID, 'tdd-sup-042');

    assert.deepStrictEqual(affected.sort(), ['tdd-sup-040', 'tdd-sup-041']);
    const files = await sql`
      SELECT status FROM "PublishFile"
      WHERE id IN ('tdd-sup-pf-040', 'tdd-sup-pf-041')
    `;
    assert.ok(files.every((f) => f.status === 'canceled'));
  });

  test('does not cancel files from non-github_webhook publishes', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-050', ${TEST_SITE_ID}, 'cli', 'in_progress'),
        ('tdd-sup-051', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES
        ('tdd-sup-pf-050', 'tdd-sup-050', 'a.md', 'added', 'uploading'),
        ('tdd-sup-pf-051', 'tdd-sup-051', 'a.md', 'added', 'uploading')
    `;

    const affected = await cancelSupersededGithubPublish(sql, TEST_SITE_ID, 'tdd-sup-051');

    assert.deepStrictEqual(affected, []);
    const [cliFile] = await sql`SELECT status FROM "PublishFile" WHERE id = 'tdd-sup-pf-050'`;
    assert.strictEqual(cliFile.status, 'uploading'); // untouched
    // new github publish's own file untouched
    const [ghFile] = await sql`SELECT status FROM "PublishFile" WHERE id = 'tdd-sup-pf-051'`;
    assert.strictEqual(ghFile.status, 'uploading');
  });
});

describe('cancelPublishFilesForPaths', () => {
  test('cancels uploading rows for matching paths in prior publishes and returns their ids', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-100', ${TEST_SITE_ID}, 'cli', 'in_progress'),
        ('tdd-sup-101', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES
        ('tdd-sup-pf-100', 'tdd-sup-100', 'a.md', 'added', 'uploading'),
        ('tdd-sup-pf-101', 'tdd-sup-100', 'b.md', 'added', 'uploading')
    `;

    const affected = await cancelPublishFilesForPaths(sql, TEST_SITE_ID, 'tdd-sup-101', ['a.md']);

    assert.deepStrictEqual(affected, ['tdd-sup-100']);
    const [a] = await sql`SELECT status FROM "PublishFile" WHERE id = 'tdd-sup-pf-100'`;
    assert.strictEqual(a.status, 'canceled');
    const [b] = await sql`SELECT status FROM "PublishFile" WHERE id = 'tdd-sup-pf-101'`;
    assert.strictEqual(b.status, 'uploading'); // b.md not in the path set
  });

  test('returns empty array when no matching uploading rows exist', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES ('tdd-sup-110', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;

    const affected = await cancelPublishFilesForPaths(sql, TEST_SITE_ID, 'tdd-sup-110', ['a.md']);

    assert.deepStrictEqual(affected, []);
  });

  test('does not cancel already-terminal rows for matching paths', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-120', ${TEST_SITE_ID}, 'cli', 'in_progress'),
        ('tdd-sup-121', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES ('tdd-sup-pf-120', 'tdd-sup-120', 'a.md', 'added', 'success')
    `;

    const affected = await cancelPublishFilesForPaths(sql, TEST_SITE_ID, 'tdd-sup-121', ['a.md']);

    assert.deepStrictEqual(affected, []);
    const [file] = await sql`SELECT status FROM "PublishFile" WHERE id = 'tdd-sup-pf-120'`;
    assert.strictEqual(file.status, 'success');
  });

  test('does not cancel rows not matching the given paths', async () => {
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-130', ${TEST_SITE_ID}, 'cli', 'in_progress'),
        ('tdd-sup-131', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES ('tdd-sup-pf-130', 'tdd-sup-130', 'b.md', 'added', 'uploading')
    `;

    await cancelPublishFilesForPaths(sql, TEST_SITE_ID, 'tdd-sup-131', ['a.md']);

    const [file] = await sql`SELECT status FROM "PublishFile" WHERE id = 'tdd-sup-pf-130'`;
    assert.strictEqual(file.status, 'uploading'); // b.md untouched
  });
});

describe('supersession → completion integration', () => {
  test('superseded publish finalizes immediately when all files are canceled', async () => {
    // Prior github_webhook publish has only one uploading file
    await sql`
      INSERT INTO "Publish" (id, site_id, source, status)
      VALUES
        ('tdd-sup-200', ${TEST_SITE_ID}, 'github_webhook', 'in_progress'),
        ('tdd-sup-201', ${TEST_SITE_ID}, 'github_webhook', 'in_progress')
    `;
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES ('tdd-sup-pf-200', 'tdd-sup-200', 'a.md', 'added', 'uploading')
    `;

    const affected = await cancelSupersededGithubPublish(sql, TEST_SITE_ID, 'tdd-sup-201');
    assert.deepStrictEqual(affected, ['tdd-sup-200']);

    // Running completion check on the superseded publish should win
    const won = await checkPublishCompletion(sql, 'tdd-sup-200');

    assert.strictEqual(won, true);
    const [row] = await sql`SELECT status FROM "Publish" WHERE id = 'tdd-sup-200'`;
    assert.strictEqual(row.status, 'finalizing');
  });
});
