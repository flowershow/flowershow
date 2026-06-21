import postgres from 'postgres';
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import { finalizePublish } from '../../src/publish-finalizer-workflow.js';

vi.mock('cloudflare:workers', () => ({ WorkflowEntrypoint: class {} }));

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/flowershow-dev';

const TEST_USER_ID = 'test-user-publish-finalizer';
const TEST_SITE_ID = 'test-site-publish-finalizer';

let sql;

beforeAll(async () => {
  sql = postgres(DATABASE_URL, { max: 1 });

  await sql`
    INSERT INTO "User" (id, username, updated_at)
    VALUES (${TEST_USER_ID}, ${TEST_USER_ID}, NOW())
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO "Site" (id, subdomain, project_name, updated_at, user_id)
    VALUES (${TEST_SITE_ID}, ${TEST_SITE_ID}, 'Test Publish Finalizer', NOW(), ${TEST_USER_ID})
    ON CONFLICT (id) DO NOTHING
  `;
});

afterAll(async () => {
  await sql`DELETE FROM "User" WHERE id = ${TEST_USER_ID}`;
  await sql.end();
});

afterEach(async () => {
  await sql`DELETE FROM "Publish" WHERE site_id = ${TEST_SITE_ID}`;
});

async function seedPublish(publishId, files) {
  await sql`
    INSERT INTO "Publish" (id, site_id, source)
    VALUES (${publishId}, ${TEST_SITE_ID}, 'cli')
  `;
  for (const { path, status } of files) {
    await sql`
      INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
      VALUES (${crypto.randomUUID()}, ${publishId}, ${path}, 'added', ${status})
    `;
  }
}

test('all files succeeded: sets publish status to success', async () => {
  const publishId = crypto.randomUUID();
  await seedPublish(publishId, [
    { path: 'a.md', status: 'success' },
    { path: 'b.md', status: 'success' },
  ]);

  await finalizePublish({ sql, publishId, timedOut: false });

  const [publish] =
    await sql`SELECT status, completed_at FROM "Publish" WHERE id = ${publishId}`;
  expect(publish.status).toBe('success');
  expect(publish.completed_at).not.toBeNull();
});

test('some files errored: sets publish status to error', async () => {
  const publishId = crypto.randomUUID();
  await seedPublish(publishId, [
    { path: 'a.md', status: 'success' },
    { path: 'b.md', status: 'error' },
  ]);

  await finalizePublish({ sql, publishId, timedOut: false });

  const [{ status }] =
    await sql`SELECT status FROM "Publish" WHERE id = ${publishId}`;
  expect(status).toBe('error');
});

test('all files canceled: sets publish status to superseded', async () => {
  const publishId = crypto.randomUUID();
  await seedPublish(publishId, [
    { path: 'a.md', status: 'canceled' },
    { path: 'b.md', status: 'canceled' },
  ]);

  await finalizePublish({ sql, publishId, timedOut: false });

  const [{ status }] =
    await sql`SELECT status FROM "Publish" WHERE id = ${publishId}`;
  expect(status).toBe('superseded');
});

test('some files canceled and some succeeded: sets publish status to success', async () => {
  const publishId = crypto.randomUUID();
  await seedPublish(publishId, [
    { path: 'a.md', status: 'canceled' },
    { path: 'b.md', status: 'success' },
  ]);

  await finalizePublish({ sql, publishId, timedOut: false });

  const [{ status }] =
    await sql`SELECT status FROM "Publish" WHERE id = ${publishId}`;
  expect(status).toBe('success');
});

test('some files canceled and some errored: sets publish status to error', async () => {
  const publishId = crypto.randomUUID();
  await seedPublish(publishId, [
    { path: 'a.md', status: 'canceled' },
    { path: 'b.md', status: 'error' },
  ]);

  await finalizePublish({ sql, publishId, timedOut: false });

  const [{ status }] =
    await sql`SELECT status FROM "Publish" WHERE id = ${publishId}`;
  expect(status).toBe('error');
});

test('timed out: marks uploading files as expired and publish as error', async () => {
  const publishId = crypto.randomUUID();
  await seedPublish(publishId, [
    { path: 'a.md', status: 'uploading' },
    { path: 'b.md', status: 'uploading' },
  ]);

  await finalizePublish({ sql, publishId, timedOut: true });

  const [{ status }] =
    await sql`SELECT status FROM "Publish" WHERE id = ${publishId}`;
  expect(status).toBe('error');

  const files =
    await sql`SELECT status FROM "PublishFile" WHERE publish_id = ${publishId}`;
  expect(files.every((f) => f.status === 'expired')).toBe(true);
});
