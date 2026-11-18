import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  convertDocument,
  indexConvertedDocument,
  recordConversionFailure,
} from '../../src/converted-document.js';
import { computeGitBlobSha } from '../../src/github.js';
import notAZipB64 from '../fixtures/docx/not-a-zip.b64.js';
import wordB64 from '../fixtures/docx/word.b64.js';

const bytesOf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const WORD = bytesOf(wordB64);
const SITE = 'site-1';
const PATH = 'Q3 Report.docx';
const RAW = `${SITE}/main/raw/${PATH}`;
const DERIVED = `${SITE}/main/derived/${PATH}/`;

afterEach(() => {
  vi.unstubAllGlobals();
});

/** In-memory R2 bucket recording writes and deletes in order. */
function createMemoryR2(initial = {}) {
  const encode = (v) =>
    typeof v === 'string' ? new TextEncoder().encode(v) : v;
  const objects = new Map(
    Object.entries(initial).map(([k, v]) => [k, { bytes: encode(v) }]),
  );
  const log = [];
  const client = {
    head: async (key) => (objects.has(key) ? { customMetadata: {} } : null),
    get: async (key) => {
      const obj = objects.get(key);
      if (!obj) return null;
      const { bytes } = obj;
      return {
        size: bytes.length,
        arrayBuffer: async () => bytes.slice().buffer,
        text: async () => new TextDecoder().decode(bytes),
        body: new ReadableStream({
          start(c) {
            c.enqueue(bytes.slice());
            c.close();
          },
        }),
      };
    },
    put: async (key, value, options) => {
      objects.set(key, { bytes: encode(value), options });
      log.push(['put', key]);
    },
    delete: async (keys) => {
      for (const key of [keys].flat()) {
        objects.delete(key);
        log.push(['delete', key]);
      }
    },
    list: async ({ prefix }) => ({
      objects: [...objects.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((key) => ({ key })),
      truncated: false,
    }),
  };
  return { storage: { type: 'r2', client, bucket: null }, objects, log };
}

/** Recording sql; `respond(text, values)` may return rows for a query. */
function createSql(respond = () => undefined, log = []) {
  const queries = [];
  const sql = (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    queries.push({ text, values });
    if (text.startsWith('UPDATE "PublishFile"'))
      log.push(['sql', 'PublishFile']);
    const rows = respond(text, values);
    if (rows) return rows;
    if (text.startsWith('INSERT INTO "Blob"')) return [{ id: 'blob-1' }];
    return [];
  };
  sql.begin = async (fn) => fn(sql);
  return { sql, queries };
}

const typesense = {
  upsertDocument: async () => {},
  deleteDocument: async () => {},
};

const derivedKeys = (objects) =>
  [...objects.keys()].filter((k) => k.startsWith(DERIVED)).sort();

describe('convertDocument', () => {
  test('writes image1.png then index.md under the sha folder', async () => {
    const sha = await computeGitBlobSha(WORD);
    const { storage, objects, log } = createMemoryR2({ [RAW]: WORD });

    const result = await convertDocument({
      storage,
      siteId: SITE,
      path: PATH,
      sha,
    });

    expect(result.superseded).toBeUndefined();
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(log).toEqual([
      ['put', `${DERIVED}${sha}/image1.png`],
      ['put', `${DERIVED}${sha}/index.md`],
    ]);
    const image = objects.get(`${DERIVED}${sha}/image1.png`);
    expect(image.options.httpMetadata.contentType).toBe('image/png');
    const md = new TextDecoder().decode(
      objects.get(`${DERIVED}${sha}/index.md`).bytes,
    );
    expect(md.startsWith('# Board Memo')).toBe(true);
    expect(md).toContain(`/_derived/Q3%20Report.docx/${sha}/image1.png`);
  });

  test('returns superseded when the stored file has another sha', async () => {
    const { storage, log } = createMemoryR2({ [RAW]: WORD });

    const result = await convertDocument({
      storage,
      siteId: SITE,
      path: PATH,
      sha: 'f'.repeat(40),
    });

    expect(result).toEqual({ superseded: true });
    expect(log).toEqual([]);
  });

  test('returns superseded when the stored file is gone', async () => {
    const { storage } = createMemoryR2({});
    const result = await convertDocument({
      storage,
      siteId: SITE,
      path: PATH,
      sha: 'f'.repeat(40),
    });
    expect(result).toEqual({ superseded: true });
  });

  test('rejects a file over 10 MB with a readable message', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    const { storage } = createMemoryR2({ [RAW]: big });
    await expect(
      convertDocument({
        storage,
        siteId: SITE,
        path: PATH,
        sha: 'a'.repeat(40),
      }),
    ).rejects.toMatchObject({
      name: 'DocxRejectedError',
      message: 'This Word document is larger than 10 MB, the conversion limit.',
    });
  });

  test('rejects a file that is not a Word document', async () => {
    const bad = bytesOf(notAZipB64);
    const sha = await computeGitBlobSha(bad);
    const { storage } = createMemoryR2({ [RAW]: bad });
    await expect(
      convertDocument({ storage, siteId: SITE, path: PATH, sha }),
    ).rejects.toMatchObject({ name: 'DocxRejectedError' });
  });
});

describe('indexConvertedDocument', () => {
  async function setup({
    markdown = '# Q3 Report\n\nRevenue grew.',
    respond,
  } = {}) {
    const sha = await computeGitBlobSha(WORD);
    const r2 = createMemoryR2({
      [RAW]: WORD,
      [`${DERIVED}${sha}/index.md`]: markdown,
      [`${DERIVED}${sha}/image1.png`]: 'png',
    });
    const db = createSql(respond, r2.log);
    return { sha, ...r2, ...db };
  }

  const args = (ctx, extra = {}) => ({
    storage: ctx.storage,
    sql: ctx.sql,
    typesense,
    env: {},
    siteId: SITE,
    path: PATH,
    sha: ctx.sha,
    size: WORD.length,
    publishId: 'pub-1',
    warnings: [],
    ...extra,
  });

  const blobInsert = (ctx) =>
    ctx.queries.find((q) => q.text.startsWith('INSERT INTO "Blob"'));
  const publishFileUpdate = (ctx) =>
    ctx.queries.find((q) => q.text.startsWith('UPDATE "PublishFile"'));

  test('Blob gets app_path /Q3+Report, the docx sha and size, metadata.convertedWith', async () => {
    const ctx = await setup();

    await indexConvertedDocument(args(ctx));

    const insert = blobInsert(ctx);
    // values: id, site_id, path, app_path, extension, sha, size, metadata, ...
    expect(insert.values[1]).toBe(SITE);
    expect(insert.values[2]).toBe(PATH);
    expect(insert.values[3]).toBe('/Q3+Report');
    expect(insert.values[4]).toBe('docx');
    expect(insert.values[5]).toBe(ctx.sha);
    expect(insert.values[6]).toBe(WORD.length);
    expect(insert.values[7]).toMatchObject({
      title: 'Q3 Report',
      convertedWith: 'mammoth-1',
    });
    expect(publishFileUpdate(ctx).text).toContain("status = 'success'");
  });

  test('stops and cleans its folder when the docx was deleted', async () => {
    const ctx = await setup();
    ctx.objects.delete(RAW);

    await indexConvertedDocument(args(ctx));

    expect(blobInsert(ctx)).toBeUndefined();
    expect(derivedKeys(ctx.objects)).toEqual([]);
  });

  test('stops when the docx was replaced by a newer version', async () => {
    const ctx = await setup();
    const newer = `${DERIVED}${'b'.repeat(40)}/index.md`;
    ctx.objects.set(RAW, { bytes: new TextEncoder().encode('newer') });
    ctx.objects.set(newer, { bytes: new TextEncoder().encode('# Newer') });

    await indexConvertedDocument(args(ctx));

    expect(blobInsert(ctx)).toBeUndefined();
    expect(derivedKeys(ctx.objects)).toEqual([newer]);
  });

  test('warns when report.md has the same URL', async () => {
    const ctx = await setup({
      respond: (text) =>
        text.startsWith('SELECT path FROM "Blob"')
          ? [{ path: 'Q3 Report.md' }]
          : undefined,
    });

    await indexConvertedDocument(
      args(ctx, {
        warnings: ['Equations are not supported and were left out.'],
      }),
    );

    const update = publishFileUpdate(ctx);
    expect(update.text).toContain("status = 'error'");
    expect(update.values[0]).toBe(
      'Converted with warnings: Equations are not supported and were left out.; Q3 Report.md already uses this URL, so this Word file is only available as a download.',
    );
  });

  test('removes older sha folders after success', async () => {
    const ctx = await setup();
    const old = `${DERIVED}${'0'.repeat(40)}/`;
    ctx.objects.set(`${old}index.md`, { bytes: new Uint8Array() });
    ctx.objects.set(`${old}image1.png`, { bytes: new Uint8Array() });

    await indexConvertedDocument(args(ctx));

    // Old folders go only after the PublishFile flip (and revalidation), so a
    // cached page never points at deleted images.
    const flip = ctx.log.findIndex(([op]) => op === 'sql');
    const firstDelete = ctx.log.findIndex(([op]) => op === 'delete');
    expect(flip).toBeGreaterThanOrEqual(0);
    expect(firstDelete).toBeGreaterThan(flip);

    expect(derivedKeys(ctx.objects)).toEqual([
      `${DERIVED}${ctx.sha}/image1.png`,
      `${DERIVED}${ctx.sha}/index.md`,
    ]);
  });

  test('converts again when its index.md is missing', async () => {
    const ctx = await setup();
    ctx.objects.delete(`${DERIVED}${ctx.sha}/index.md`);

    await indexConvertedDocument(args(ctx));

    expect(blobInsert(ctx).values[7].title).toBe('Board Memo');
  });

  test('publish: false deletes the raw docx', async () => {
    const ctx = await setup({ markdown: '---\npublish: false\n---\n# Hidden' });

    await indexConvertedDocument(args(ctx));

    expect(ctx.objects.has(RAW)).toBe(false);
    expect(blobInsert(ctx)).toBeUndefined();
  });

  test('falls back to a humanised file name for the title', async () => {
    const ctx = await setup({ markdown: 'No heading here.' });
    await indexConvertedDocument(args(ctx));
    expect(blobInsert(ctx).values[7].title).toBe('Q3 Report');
  });
});

describe('recordConversionFailure', () => {
  test('creates a raw-asset Blob when none exists and sets the PublishFile error', async () => {
    const { sql, queries } = createSql();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await recordConversionFailure({
      sql,
      env: { POSTHOG_KEY: 'k' },
      siteId: SITE,
      path: PATH,
      sha: 'a'.repeat(40),
      size: 1234,
      publishId: 'pub-1',
      error: new Error('This Word document could not be read.'),
    });

    const update = queries.find((q) =>
      q.text.startsWith('UPDATE "PublishFile"'),
    );
    expect(update.text).toContain("status = 'error'");
    expect(update.values[0]).toBe(
      'Could not convert this Word document: This Word document could not be read.',
    );
    const insert = queries.find((q) => q.text.startsWith('INSERT INTO "Blob"'));
    expect(insert.values[2]).toBe(PATH);
    expect(insert.values[3]).toBeNull();
    expect(insert.values[4]).toBe('docx');
    expect(insert.values[5]).toBe('a'.repeat(40));
    expect(insert.values[6]).toBe(1234);
    expect(insert.values[7]).toBeNull();

    const event = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(event.properties).toMatchObject({
      source: 'worker_docx_convert',
      siteId: SITE,
      path: PATH,
      size: 1234,
    });
  });

  test('keeps an existing Blob (the previous version stays live)', async () => {
    const { sql, queries } = createSql((text) =>
      text.startsWith('SELECT id FROM "Blob"') ? [{ id: 'blob-1' }] : undefined,
    );

    await recordConversionFailure({
      sql,
      env: {},
      siteId: SITE,
      path: PATH,
      sha: 'a'.repeat(40),
      size: 1,
      publishId: 'pub-1',
      error: 'Too big',
    });

    expect(queries.some((q) => q.text.startsWith('INSERT INTO "Blob"'))).toBe(
      false,
    );
    const update = queries.find((q) =>
      q.text.startsWith('UPDATE "PublishFile"'),
    );
    expect(update.values[0]).toBe(
      'Could not convert this Word document: Too big',
    );
  });
});
