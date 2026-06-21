import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeFilesToDelete,
  computeFilesToUpsert,
  createBatches,
  normalizeRootDir,
} from '../src/workflow-utils.js';

// Minimal GitHub tree factory
function makeTree(items) {
  return { tree: items.map(([path, sha]) => ({ type: 'blob', path, sha })) };
}

describe('normalizeRootDir', () => {
  it('returns empty string when rootDir is falsy', () => {
    assert.equal(normalizeRootDir(null), '');
    assert.equal(normalizeRootDir(''), '');
    assert.equal(normalizeRootDir(undefined), '');
  });

  it('appends trailing slash and strips leading slashes', () => {
    assert.equal(normalizeRootDir('docs'), 'docs/');
    assert.equal(normalizeRootDir('/docs'), 'docs/');
    assert.equal(normalizeRootDir('docs/'), 'docs/');
    assert.equal(normalizeRootDir('/docs/'), 'docs/');
  });

  it('handles nested paths', () => {
    assert.equal(normalizeRootDir('src/content'), 'src/content/');
  });
});

describe('createBatches', () => {
  it('returns empty array for empty input', () => {
    assert.deepEqual(createBatches([], 10), []);
  });

  it('returns single batch when items fit', () => {
    assert.deepEqual(createBatches([1, 2, 3], 5), [[1, 2, 3]]);
  });

  it('splits into multiple batches', () => {
    assert.deepEqual(createBatches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it('handles exact multiple of batch size', () => {
    assert.deepEqual(createBatches([1, 2, 3, 4], 2), [
      [1, 2],
      [3, 4],
    ]);
  });
});

describe('computeFilesToUpsert', () => {
  const emptyBlobs = [];
  const tree = makeTree([
    ['docs/a.md', 'sha-a'],
    ['docs/b.md', 'sha-b'],
  ]);

  it('returns all files as added when no existing blobs', () => {
    const result = computeFilesToUpsert(
      emptyBlobs,
      tree,
      'docs/',
      [],
      [],
      false,
    );
    assert.equal(result.length, 2);
    assert.equal(result[0].filePath, 'a.md');
    assert.equal(result[0].changeType, 'added');
    assert.equal(result[1].filePath, 'b.md');
  });

  it('marks file as updated when sha changed', () => {
    const blobs = [{ path: 'a.md', sha: 'old-sha' }];
    const result = computeFilesToUpsert(blobs, tree, 'docs/', [], [], false);
    const updated = result.find((f) => f.filePath === 'a.md');
    assert.equal(updated.changeType, 'updated');
  });

  it('filters out tree-type entries', () => {
    const treeWithDir = {
      tree: [
        { type: 'tree', path: 'docs/', sha: 'x' },
        { type: 'blob', path: 'docs/a.md', sha: 'sha-a' },
      ],
    };
    const result = computeFilesToUpsert(
      emptyBlobs,
      treeWithDir,
      'docs/',
      [],
      [],
      false,
    );
    assert.equal(result.length, 1);
  });

  it('respects excludes', () => {
    // isPathVisible receives the full tree path (e.g. 'docs/a.md'), so
    // exclude patterns must match that full path, not the stripped filePath.
    const result = computeFilesToUpsert(
      emptyBlobs,
      tree,
      'docs/',
      [],
      ['/docs/a.md'],
      false,
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].filePath, 'b.md');
  });

  it('respects includes — only matches included paths', () => {
    const result = computeFilesToUpsert(
      emptyBlobs,
      tree,
      'docs/',
      ['/docs/a.md'],
      [],
      false,
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].filePath, 'a.md');
  });
});

describe('computeFilesToDelete', () => {
  const tree = makeTree([['docs/a.md', 'sha-a']]);

  it('returns blobs not present in the tree', () => {
    const blobs = [{ path: 'a.md' }, { path: 'b.md' }];
    const result = computeFilesToDelete(blobs, tree, 'docs/', [], []);
    assert.deepEqual(result, [{ path: 'b.md' }]);
  });

  it('returns empty array when all blobs are in tree', () => {
    const blobs = [{ path: 'a.md' }];
    const result = computeFilesToDelete(blobs, tree, 'docs/', [], []);
    assert.deepEqual(result, []);
  });

  it('returns all blobs when tree is empty', () => {
    const blobs = [{ path: 'a.md' }, { path: 'b.md' }];
    const result = computeFilesToDelete(blobs, { tree: [] }, 'docs/', [], []);
    assert.deepEqual(result, blobs);
  });

  it('treats excluded tree paths as non-visible, so matching blobs are deleted', () => {
    const blobs = [{ path: 'a.md' }];
    // isPathVisible receives 'docs/a.md'; exclude must match that full path.
    const result = computeFilesToDelete(
      blobs,
      tree,
      'docs/',
      [],
      ['/docs/a.md'],
    );
    assert.deepEqual(result, [{ path: 'a.md' }]);
  });
});
