import { afterEach, describe, it, expect, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ WorkflowEntrypoint: class {} }));

const { computeFilesToUpsert, computeFilesToDelete } = await import(
  '../../src/github-sync-workflow.js'
);
const { GitHubRateLimitError, fetchGitHubFileStream } = await import(
  '../../src/github.js'
);

function makeTree(items) {
  return { tree: items };
}

function makeItem(path, sha = 'abc123', type = 'blob', size = 1) {
  return { path, sha, type, size };
}

describe('computeFilesToUpsert', () => {
  it('marks new file as added', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([makeItem('notes/page.md', 'sha1')]),
      'notes/',
      [],
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      filePath: 'page.md',
      changeType: 'added',
    });
  });

  it('marks file with changed SHA as updated', () => {
    const result = computeFilesToUpsert(
      [{ path: 'page.md', sha: 'old' }],
      makeTree([makeItem('notes/page.md', 'new')]),
      'notes/',
      [],
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      filePath: 'page.md',
      changeType: 'updated',
    });
  });

  it('excludes file with unchanged SHA', () => {
    const result = computeFilesToUpsert(
      [{ path: 'page.md', sha: 'same' }],
      makeTree([makeItem('notes/page.md', 'same')]),
      'notes/',
      [],
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('skips directory tree items', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([{ path: 'notes', sha: 'abc', type: 'tree' }]),
      '',
      [],
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('skips files outside rootDir', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([makeItem('other/page.md', 'sha1')]),
      'notes/',
      [],
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('strips rootDir prefix from filePath', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([makeItem('content/docs/page.md', 'sha1')]),
      'content/',
      [],
      [],
    );
    expect(result[0].filePath).toBe('docs/page.md');
  });

  it('includes all files when rootDir is empty', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([makeItem('a.md', 'sha1'), makeItem('b/c.md', 'sha2')]),
      '',
      [],
      [],
    );
    expect(result).toHaveLength(2);
  });

  it('excludes files matching excludes', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([
        makeItem('private/secret.md', 'sha1'),
        makeItem('public/page.md', 'sha2'),
      ]),
      '',
      [],
      ['private'],
    );
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('public/page.md');
  });

  it('excludes files matching excludes when a rootDir is set (#1331)', () => {
    // Exclude patterns are site-relative ("/notes"); the GitHub tree paths carry
    // the rootDir prefix ("site/notes/..."). The exclude must still match after
    // the prefix is stripped.
    const result = computeFilesToUpsert(
      [],
      makeTree([
        makeItem('site/notes/private.md', 'sha1'),
        makeItem('site/docs/page.md', 'sha2'),
      ]),
      'site/',
      [],
      ['/notes'],
    );
    expect(result.map((r) => r.filePath)).toEqual(['docs/page.md']);
  });

  it('applies includes relative to rootDir (#1331)', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([
        makeItem('site/docs/page.md', 'sha1'),
        makeItem('site/notes/page.md', 'sha2'),
      ]),
      'site/',
      ['/docs'],
      [],
    );
    expect(result.map((r) => r.filePath)).toEqual(['docs/page.md']);
  });

  it('includes only files matching includes when includes is non-empty', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([
        makeItem('docs/page.md', 'sha1'),
        makeItem('other/page.md', 'sha2'),
      ]),
      '',
      ['docs'],
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('docs/page.md');
  });

  it('excludes takes precedence over includes', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([makeItem('docs/secret.md', 'sha1')]),
      '',
      ['docs'],
      ['docs/secret.md'],
    );
    expect(result).toHaveLength(0);
  });

  it('always includes config.json regardless of includes filter', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([makeItem('config.json', 'sha1'), makeItem('page.md', 'sha2')]),
      '',
      ['docs'],
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('config.json');
  });

  it('always includes custom.css regardless of includes filter', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([makeItem('custom.css', 'sha1'), makeItem('page.md', 'sha2')]),
      '',
      ['docs'],
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('custom.css');
  });

  it('returns empty array for empty tree', () => {
    const result = computeFilesToUpsert(
      [{ path: 'page.md', sha: 'sha1' }],
      makeTree([]),
      '',
      [],
      [],
    );
    expect(result).toHaveLength(0);
  });
});

describe('computeFilesToDelete', () => {
  it('returns blob no longer in the tree', () => {
    const result = computeFilesToDelete(
      [{ path: 'old.md' }],
      makeTree([makeItem('new.md', 'sha1')]),
      '',
      [],
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('old.md');
  });

  it('does not return blob still present in the tree', () => {
    const result = computeFilesToDelete(
      [{ path: 'page.md' }],
      makeTree([makeItem('page.md', 'sha1')]),
      '',
      [],
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('returns blob excluded from visible paths', () => {
    const result = computeFilesToDelete(
      [{ path: 'private/secret.md' }],
      makeTree([makeItem('private/secret.md', 'sha1')]),
      '',
      [],
      ['private'],
    );
    expect(result).toHaveLength(1);
  });

  it('returns empty array when existingBlobs is empty', () => {
    const result = computeFilesToDelete(
      [],
      makeTree([makeItem('page.md', 'sha1')]),
      '',
      [],
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('returns all blobs when tree is empty', () => {
    const result = computeFilesToDelete(
      [{ path: 'a.md' }, { path: 'b.md' }],
      makeTree([]),
      '',
      [],
      [],
    );
    expect(result).toHaveLength(2);
  });

  it('strips rootDir when computing visible paths', () => {
    const result = computeFilesToDelete(
      [{ path: 'page.md' }],
      makeTree([makeItem('content/page.md', 'sha1')]),
      'content/',
      [],
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('deletes now-excluded blobs when a rootDir is set (#1331)', () => {
    // A previously-synced blob whose path is now covered by contentExclude must
    // be marked for deletion even though the tree path carries the rootDir prefix.
    const result = computeFilesToDelete(
      [{ path: 'notes/private.md' }, { path: 'docs/page.md' }],
      makeTree([
        makeItem('site/notes/private.md', 'sha1'),
        makeItem('site/docs/page.md', 'sha2'),
      ]),
      'site/',
      [],
      ['/notes'],
    );
    expect(result.map((b) => b.path)).toEqual(['notes/private.md']);
  });
});

/** In-memory R2 bucket with the methods storage.js uses. */
function createFakeBucket(keys = []) {
  const objects = new Map(keys.map((key) => [key, new Uint8Array()]));
  return {
    objects,
    async put(key, value) {
      objects.set(key, new Uint8Array(await new Response(value).arrayBuffer()));
    },
    async get(key) {
      const bytes = objects.get(key);
      return bytes && { size: bytes.length, arrayBuffer: async () => bytes };
    },
    async delete(keys) {
      for (const key of [keys].flat()) objects.delete(key);
    },
    async list({ prefix }) {
      const matching = [...objects.keys()].filter((k) => k.startsWith(prefix));
      return { objects: matching.map((key) => ({ key })), truncated: false };
    },
  };
}

/**
 * Run the workflow against a fake bucket and GitHub. The site has `blobs`;
 * steps fail like Cloudflare's when their output is over 1 MiB. `beforeDownload`
 * runs before each GitHub file download and can throw. `resetAtStep` makes the
 * runtime throw into run() once when that step starts, as a code update does;
 * run() then runs again and finished steps return their stored output.
 */
async function runSync({
  tree,
  blobs = [],
  bucketKeys = [],
  beforeDownload,
  resetAtStep,
}) {
  vi.resetModules();
  const bucket = createFakeBucket(bucketKeys);
  const queries = [];
  const downloads = [];
  vi.doMock('../../src/utils.js', () => ({
    captureError: vi.fn(),
    generateId: () => 'id',
  }));
  vi.doMock('../../src/github.js', () => ({
    GitHubRateLimitError,
    getGitHubInstallationToken: async () => 'token',
    fetchGitHubConfig: async () => ({}),
    fetchGitHubRepoTree: async () => tree,
    fetchGitHubFileStream: async (_repo, sha) => {
      downloads.push(sha);
      if (beforeDownload) await beforeDownload(sha);
      const { size } = tree.tree.find((item) => item.sha === sha);
      return new Blob([new Uint8Array(size)]).stream();
    },
  }));
  const sql = async (strings, ...values) => {
    const text = strings.join('?');
    queries.push({ text, values });
    if (text.includes('FROM "Site"')) return [{ id: 'site1' }];
    if (text.includes('FROM "Blob"')) return blobs;
    return [];
  };
  vi.doMock('../../src/clients.js', () => ({
    getPostgresClient: () => sql,
    getStorageClient: () => ({ type: 'r2', client: bucket }),
  }));

  const { GitHubSyncWorkflow } = await import(
    '../../src/github-sync-workflow.js'
  );
  const workflow = new GitHubSyncWorkflow();
  workflow.env = { PUBLISH_FINALIZER_WORKFLOW: { create: vi.fn() } };
  const stored = new Map();
  let resetPending = resetAtStep;
  const step = {
    do: async (name, fn) => {
      if (stored.has(name)) return stored.get(name);
      if (name === resetPending) {
        resetPending = undefined;
        throw new Error('Durable Object reset because its code was updated.');
      }
      const output = await fn();
      const bytes = JSON.stringify(output ?? null).length;
      if (bytes > 1024 * 1024) throw new Error(`${name} output ${bytes} B`);
      stored.set(name, output);
      return output;
    },
    sleep: vi.fn(),
  };
  const event = {
    instanceId: 'pub1-github',
    payload: {
      publishId: 'pub1',
      siteId: 'site1',
      ghRepository: 'org/repo',
      ghBranch: 'design-system-site',
      rootDir: '',
      githubInstallationId: '1',
    },
  };
  const run = workflow.run(event, step).catch((err) => {
    if (!err.message.startsWith('Durable Object reset')) throw err;
    return workflow.run(event, step);
  });
  return {
    run,
    bucket,
    queries,
    downloads,
    sleep: step.sleep,
    finalizer: workflow.env.PUBLISH_FINALIZER_WORKFLOW.create,
  };
}

const planKeys = (bucket) =>
  [...bucket.objects.keys()].filter((key) => key.includes('/_github-sync/'));

describe('GitHubSyncWorkflow', () => {
  it('writes and deletes under the "main" storage prefix, not the git branch', async () => {
    const { run, bucket } = await runSync({
      tree: makeTree([
        makeItem('page.md', 'sha1', 'blob', 5),
        makeItem('img.png', 'sha2', 'blob', 7),
      ]),
      // old.md is gone from the GitHub tree, so it gets deleted.
      blobs: [{ path: 'old.md', sha: 'x' }],
      bucketKeys: ['site1/main/raw/old.md'],
    });
    await run;

    expect([...bucket.objects.keys()].sort()).toEqual([
      'site1/main/raw/img.png',
      'site1/main/raw/page.md',
    ]);
    expect(bucket.objects.get('site1/main/raw/img.png')).toHaveLength(7);
  });

  // Each step output is capped at 1 MiB. The batches of a sync this size were
  // over it when steps returned them.
  it('syncs 8,000 new files with every step output under 1 MiB', async () => {
    const items = Array.from({ length: 8000 }, (_, i) =>
      makeItem(
        `notes/section-${i % 50}/a-fairly-long-page-name-${i}.md`,
        `s${i}`,
      ),
    );
    const { run, bucket, queries } = await runSync({ tree: makeTree(items) });
    await run;

    const uploaded = [...bucket.objects.keys()];
    expect(uploaded).toHaveLength(8000);
    expect(planKeys(bucket)).toEqual([]);
    const publishFiles = queries.filter((q) =>
      q.text.includes('INSERT INTO "PublishFile"'),
    );
    expect(publishFiles).toHaveLength(8000);
  });

  it('stops before deleting anything when GitHub cuts the file list', async () => {
    const { run, bucket, downloads } = await runSync({
      tree: { ...makeTree([makeItem('page.md', 'sha1')]), truncated: true },
      blobs: [{ path: 'old.md', sha: 'x' }],
      bucketKeys: ['site1/main/raw/old.md'],
    });

    await expect(run).rejects.toThrow(/only part of the file list/);
    expect([...bucket.objects.keys()]).toEqual(['site1/main/raw/old.md']);
    expect(downloads).toEqual([]);
  });

  it('marks a file over 100 MB as an error without downloading it', async () => {
    const { run, bucket, queries, downloads } = await runSync({
      tree: makeTree([
        makeItem('page.md', 'sha1'),
        makeItem('video.mp4', 'big', 'blob', 100 * 1024 * 1024 + 1),
      ]),
    });
    await run;

    expect(downloads).toEqual(['sha1']);
    expect([...bucket.objects.keys()]).toEqual(['site1/main/raw/page.md']);
    const error = queries.find((q) => q.text.includes("SET status = 'error'"));
    expect(error.values).toEqual([
      'File video.mp4 exceeds maximum size of 100MB',
      'pub1',
      'video.mp4',
    ]);
  });

  // GitHub allows about 5,000 API requests per hour, one per file. A sync of
  // 6,001 files lost 1,003 of them to 403 responses.
  it('waits for the rate-limit reset and fetches the refused files again', async () => {
    let refuse = true;
    const { run, bucket, queries, downloads, sleep } =
      await runSync({
        tree: makeTree([makeItem('a.md', 'sha1'), makeItem('b.md', 'sha2')]),
        beforeDownload: async (sha) => {
          if (sha === 'sha2' && refuse) {
            refuse = false;
            throw new GitHubRateLimitError('limit', Date.now() + 60_000);
          }
        },
      });
    await run;

    expect(downloads).toEqual(['sha1', 'sha2', 'sha2']);
    expect(sleep).toHaveBeenCalledOnce();
    const ms = sleep.mock.calls[0][1];
    expect(ms).toBeGreaterThan(59_000);
    expect(ms).toBeLessThanOrEqual(61_000);
    expect([...bucket.objects.keys()].sort()).toEqual([
      'site1/main/raw/a.md',
      'site1/main/raw/b.md',
    ]);
    expect(queries.some((q) => q.text.includes("SET status = 'error'"))).toBe(
      false,
    );
  });

  // Production, 2026-11-18: a worker deploy reset a 10,501-file sync during
  // batch 519. The catch block deleted the sync plan before the runtime ran
  // the batch again, so the last 101 files were never uploaded.
  it('finishes the sync after a runtime reset in the middle of the uploads', async () => {
    const items = Array.from({ length: 50 }, (_, i) =>
      makeItem(`p${i}.md`, `s${i}`),
    );
    const { run, bucket, queries, finalizer } = await runSync({
      tree: makeTree(items),
      resetAtStep: 'process-files-to-upsert-batch-1',
    });
    await run;

    expect([...bucket.objects.keys()]).toHaveLength(50);
    expect(planKeys(bucket)).toEqual([]);
    expect(queries.some((q) => q.text.includes("SET status = 'error'"))).toBe(
      false,
    );
    expect(finalizer).toHaveBeenCalledOnce();
  });

  it('deletes sync plans left behind by failed syncs of the site', async () => {
    const { run, bucket } = await runSync({
      tree: makeTree([makeItem('a.md', 'sha1')]),
      bucketKeys: ['site1/_github-sync/raw/oldpub/upsert-0.json'],
    });
    await run;

    expect(planKeys(bucket)).toEqual([]);
  });

  it('marks a file as an error when the rate limit refuses it after every wait', async () => {
    const { run, bucket, queries, sleep } = await runSync({
      tree: makeTree([makeItem('a.md', 'sha1')]),
      beforeDownload: async () => {
        throw new GitHubRateLimitError('GitHub API 403 Forbidden', 0);
      },
    });
    await run;

    expect(sleep).toHaveBeenCalledTimes(3);
    expect(bucket.objects.size).toBe(0);
    const error = queries.find((q) => q.text.includes("SET status = 'error'"));
    expect(error.values).toEqual(['GitHub API 403 Forbidden', 'pub1', 'a.md']);
  });
});

describe('githubFetch errors', () => {
  const respond = (status, headers) =>
    vi.stubGlobal('fetch', async () => new Response('', { status, headers }));
  const fetchBlob = () => fetchGitHubFileStream('org/repo', 'sha1', 'token');
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reports a used-up rate limit with its reset time', async () => {
    respond(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1700' });
    await expect(fetchBlob()).rejects.toMatchObject({
      name: 'GitHubRateLimitError',
      resetAt: 1_700_000,
    });
  });

  it('waits for retry-after on a secondary rate limit', async () => {
    vi.useFakeTimers({ now: 5_000 });
    respond(429, { 'retry-after': '60' });
    await expect(fetchBlob()).rejects.toMatchObject({ resetAt: 65_000 });
  });

  it('reports a 403 with requests left as a plain error', async () => {
    respond(403, { 'x-ratelimit-remaining': '4000' });
    const error = await fetchBlob().catch((e) => e);
    expect(error).not.toBeInstanceOf(GitHubRateLimitError);
    expect(error.message).toMatch(/GitHub API 403/);
  });
});
