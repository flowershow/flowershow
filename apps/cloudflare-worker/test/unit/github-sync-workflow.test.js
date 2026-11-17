import { describe, it, expect, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ WorkflowEntrypoint: class {} }));

const { computeFilesToUpsert, computeFilesToDelete } = await import(
  '../../src/github-sync-workflow.js'
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
 * steps fail like Cloudflare's when their output is over 1 MiB.
 */
async function runSync({ tree, blobs = [], bucketKeys = [] }) {
  vi.resetModules();
  const bucket = createFakeBucket(bucketKeys);
  const queries = [];
  const downloads = [];
  vi.doMock('../../src/utils.js', () => ({
    captureError: vi.fn(),
    generateId: () => 'id',
  }));
  vi.doMock('../../src/github.js', () => ({
    getGitHubInstallationToken: async () => 'token',
    fetchGitHubConfig: async () => ({}),
    fetchGitHubRepoTree: async () => tree,
    fetchGitHubFileStream: async (_repo, sha) => {
      downloads.push(sha);
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
  const step = {
    do: async (name, fn) => {
      const output = await fn();
      const bytes = JSON.stringify(output ?? null).length;
      if (bytes > 1024 * 1024) throw new Error(`${name} output ${bytes} B`);
      return output;
    },
  };
  const run = workflow.run(
    {
      payload: {
        publishId: 'pub1',
        siteId: 'site1',
        ghRepository: 'org/repo',
        ghBranch: 'design-system-site',
        rootDir: '',
        githubInstallationId: '1',
      },
    },
    step,
  );
  return { run, bucket, queries, downloads };
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
});
