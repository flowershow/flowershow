import { describe, it, expect, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ WorkflowEntrypoint: class {} }));

const { computeFilesToUpsert, computeFilesToDelete } = await import(
  '../../src/github-sync-workflow.js'
);

function makeTree(items) {
  return { tree: items };
}

function makeItem(path, sha = 'abc123', type = 'blob') {
  return { path, sha, type };
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
    expect(result[0]).toMatchObject({ filePath: 'page.md', changeType: 'added' });
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
    expect(result[0]).toMatchObject({ filePath: 'page.md', changeType: 'updated' });
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
      makeTree([makeItem('private/secret.md', 'sha1'), makeItem('public/page.md', 'sha2')]),
      '',
      [],
      ['private'],
    );
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('public/page.md');
  });

  it('includes only files matching includes when includes is non-empty', () => {
    const result = computeFilesToUpsert(
      [],
      makeTree([makeItem('docs/page.md', 'sha1'), makeItem('other/page.md', 'sha2')]),
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
});
