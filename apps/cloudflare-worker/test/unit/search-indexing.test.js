// Search indexing through the real Typesense client and the runtime's own
// `fetch` (workerd, via vitest-pool-workers), with Typesense and PostHog
// mocked at the network boundary. In Oct 2026 a dependency bump made every
// Typesense request throw in workerd while Node-based tests passed, and the
// failure was swallowed, so new pages silently stayed out of search for a week.
import { fetchMock } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { getTypesenseClient } from '../../src/clients.js';
import { handleMessage } from '../../src/queue-consumer.js';

const env = {
  TYPESENSE_PROTOCOL: 'https',
  TYPESENSE_HOST: 'typesense.test',
  TYPESENSE_PORT: '443',
  TYPESENSE_API_KEY: 'ts-key',
  POSTHOG_KEY: 'ph-key',
  POSTHOG_HOST: 'https://posthog.test',
};
const typesense = () => fetchMock.get('https://typesense.test');
const UPSERT_PATH = '/collections/site-1/documents?action=upsert';

const posthogEvents = [];

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
  fetchMock
    .get('https://posthog.test')
    .intercept({ method: 'POST', path: '/capture/' })
    .reply(200, ({ body }) => {
      posthogEvents.push(JSON.parse(body));
      return {};
    })
    .persist();
});

beforeEach(() => {
  posthogEvents.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function createRecordingSql(rows = {}) {
  const queries = [];
  const sql = (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    queries.push({ text, values });
    if (text.startsWith('INSERT INTO "Blob"')) return [{ id: 'blob-1' }];
    if (text.startsWith('DELETE FROM "Blob"')) return rows.deleted ?? [];
    return [];
  };
  sql.begin = async (fn) => fn(sql);
  return { sql, queries };
}

function createR2Storage(content) {
  const bytes = new TextEncoder().encode(content);
  return {
    type: 'r2',
    client: {
      head: async () => ({ customMetadata: { 'publish-id': 'pub-1' } }),
      get: async () => ({
        size: bytes.length,
        arrayBuffer: async () => bytes.buffer,
      }),
    },
  };
}

async function publish(markdown) {
  const { sql, queries } = createRecordingSql();
  await handleMessage({
    msg: {
      body: { action: 'PutObject', object: { key: 'site-1/main/raw/a.md' } },
      ack: vi.fn(),
    },
    storage: createR2Storage(markdown),
    sql,
    typesense: getTypesenseClient(env),
    env,
  });
  const update = queries.find((q) => q.text.startsWith('UPDATE "PublishFile"'));
  return {
    status: update.text.includes("status = 'error'") ? 'error' : 'success',
    error: update.text.includes("status = 'error'") ? update.values[0] : null,
  };
}

test('a published page is upserted to Typesense', async () => {
  let request;
  typesense()
    .intercept({ method: 'POST', path: UPSERT_PATH })
    .reply(200, (opts) => {
      request = opts;
      return {};
    });

  const result = await publish(
    '---\ntitle: Hello\nauthors: [Ada]\ntags: [maths]\n---\nBody #physics',
  );

  expect(result).toEqual({ status: 'success', error: null });
  expect(new Headers(request.headers).get('x-typesense-api-key')).toBe(
    'ts-key',
  );
  expect(JSON.parse(request.body)).toMatchObject({
    id: 'blob-1',
    title: 'Hello',
    path: 'a.md',
    content: 'Body #physics',
    authors: ['Ada'],
    tags: ['maths', 'physics'],
  });
  expect(posthogEvents).toEqual([]);
});

test('a document Typesense rejects is an author-facing publish error and is reported', async () => {
  typesense()
    .intercept({ method: 'POST', path: UPSERT_PATH })
    .reply(400, { message: 'Field `authors` must be an array.' });

  const result = await publish('---\nauthors: Ada\n---\nBody');

  expect(result).toEqual({
    status: 'error',
    error: 'Not added to search: Field `authors` must be an array.',
  });
  expect(posthogEvents).toHaveLength(1);
  expect(posthogEvents[0].properties).toMatchObject({
    source: 'worker_typesense_index',
    siteId: 'site-1',
    path: 'a.md',
    http_status: 400,
  });
});

test.each([
  ['an unreachable Typesense', (i) => i.replyWithError(new Error('down'))],
  ['a Typesense server error', (i) => i.reply(503, { message: 'busy' })],
])('%s keeps the page published and is reported', async (_, respond) => {
  respond(typesense().intercept({ method: 'POST', path: UPSERT_PATH }));

  const result = await publish('# Hello');

  // Not the author's to fix, so the publish itself stays successful
  expect(result).toEqual({ status: 'success', error: null });
  expect(posthogEvents).toHaveLength(1);
  expect(posthogEvents[0].properties.source).toBe('worker_typesense_index');
});

test.each([
  [404, 0],
  [500, 1],
])(
  'deleting a page whose search delete returns %i reports %i error(s)',
  async (status, reported) => {
    typesense()
      .intercept({
        method: 'DELETE',
        path: '/collections/site-1/documents/blob-1',
      })
      .reply(status, { message: 'x' });
    const { sql } = createRecordingSql({ deleted: [{ id: 'blob-1' }] });
    const msg = {
      body: { action: 'DeleteObject', object: { key: 'site-1/main/raw/a.md' } },
      ack: vi.fn(),
    };

    await handleMessage({
      msg,
      storage: null,
      sql,
      typesense: getTypesenseClient(env),
      env,
    });

    expect(msg.ack).toHaveBeenCalled();
    expect(posthogEvents).toHaveLength(reported);
    if (reported) {
      expect(posthogEvents[0].properties).toMatchObject({
        source: 'worker_typesense_delete',
        http_status: 500,
      });
    }
  },
);
