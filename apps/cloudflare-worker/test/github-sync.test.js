import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  computeFilesToUpsert,
  computeFilesToDelete,
  computeAppPath,
} from '../src/github-sync.js';

// Minimal GitHub tree item factory
const treeItem = (path, sha = 'abc123', size = 100, type = 'blob') => ({
  path,
  sha,
  size,
  type,
});

describe('computeAppPath', () => {
  test('strips .md extension and adds leading slash', () => {
    assert.strictEqual(computeAppPath('blog/post.md'), '/blog/post');
  });

  test('strips .mdx extension', () => {
    assert.strictEqual(computeAppPath('docs/guide.mdx'), '/docs/guide');
  });

  test('index.md becomes root /', () => {
    assert.strictEqual(computeAppPath('index.md'), '/');
  });

  test('nested index.md becomes directory path', () => {
    assert.strictEqual(computeAppPath('blog/index.md'), '/blog');
  });

  test('README.md becomes root /', () => {
    assert.strictEqual(computeAppPath('README.md'), '/');
  });

  test('returns null for non-markdown files', () => {
    assert.strictEqual(computeAppPath('image.png'), null);
    assert.strictEqual(computeAppPath('style.css'), null);
  });
});

describe('computeFilesToUpsert', () => {
  test('includes new files not in blob map', () => {
    const tree = [treeItem('index.md', 'sha1')];
    const blobShaMap = new Map();

    const items = computeFilesToUpsert({ tree, blobShaMap });

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].filePath, 'index.md');
    assert.strictEqual(items[0].changeType, 'added');
  });

  test('includes files whose SHA changed', () => {
    const tree = [treeItem('page.md', 'sha-new')];
    const blobShaMap = new Map([['page.md', 'sha-old']]);

    const items = computeFilesToUpsert({ tree, blobShaMap });

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].changeType, 'updated');
  });

  test('skips files whose SHA is unchanged', () => {
    const tree = [treeItem('page.md', 'sha-same')];
    const blobShaMap = new Map([['page.md', 'sha-same']]);

    const items = computeFilesToUpsert({ tree, blobShaMap });

    assert.strictEqual(items.length, 0);
  });

  test('forceSync includes unchanged SHA files', () => {
    const tree = [treeItem('page.md', 'sha-same')];
    const blobShaMap = new Map([['page.md', 'sha-same']]);

    const items = computeFilesToUpsert({ tree, blobShaMap, forceSync: true });

    assert.strictEqual(items.length, 1);
  });

  test('strips rootDir prefix from file paths', () => {
    const tree = [treeItem('docs/page.md', 'sha1')];
    const blobShaMap = new Map();

    const items = computeFilesToUpsert({ tree, blobShaMap, rootDir: 'docs' });

    assert.strictEqual(items[0].filePath, 'page.md');
  });

  test('skips tree items outside rootDir', () => {
    const tree = [treeItem('other/page.md', 'sha1'), treeItem('docs/page.md', 'sha1')];
    const blobShaMap = new Map();

    const items = computeFilesToUpsert({ tree, blobShaMap, rootDir: 'docs' });

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].filePath, 'page.md');
  });

  test('skips tree type=tree entries (directories)', () => {
    const tree = [treeItem('docs', 'sha1', 0, 'tree'), treeItem('docs/page.md', 'sha2')];
    const blobShaMap = new Map();

    const items = computeFilesToUpsert({ tree, blobShaMap });

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].filePath, 'docs/page.md');
  });

  test('respects excludes', () => {
    const tree = [treeItem('private/secret.md'), treeItem('public/page.md')];
    const blobShaMap = new Map();

    const items = computeFilesToUpsert({ tree, blobShaMap, excludes: ['/private'] });

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].filePath, 'public/page.md');
  });

  test('respects includes (whitelist)', () => {
    const tree = [treeItem('blog/post.md'), treeItem('docs/guide.md')];
    const blobShaMap = new Map();

    const items = computeFilesToUpsert({ tree, blobShaMap, includes: ['/blog'] });

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].filePath, 'blog/post.md');
  });

  test('each item has sha, size, and appPath', () => {
    const tree = [treeItem('post.md', 'abc', 512)];
    const blobShaMap = new Map();

    const items = computeFilesToUpsert({ tree, blobShaMap });

    assert.strictEqual(items[0].sha, 'abc');
    assert.strictEqual(items[0].size, 512);
    assert.strictEqual(items[0].appPath, '/post');
  });
});

describe('computeFilesToDelete', () => {
  test('returns paths in blob map not visible in tree', () => {
    const tree = [treeItem('new.md')];
    const existingPaths = ['old.md', 'new.md'];

    const paths = computeFilesToDelete({ tree, existingPaths });

    assert.deepStrictEqual(paths, ['old.md']);
  });

  test('returns empty array when all blobs still visible', () => {
    const tree = [treeItem('page.md')];
    const existingPaths = ['page.md'];

    const paths = computeFilesToDelete({ tree, existingPaths });

    assert.deepStrictEqual(paths, []);
  });

  test('respects rootDir when computing visible paths', () => {
    const tree = [treeItem('docs/page.md')];
    const existingPaths = ['page.md', 'old.md'];

    const paths = computeFilesToDelete({ tree, existingPaths, rootDir: 'docs' });

    assert.deepStrictEqual(paths.sort(), ['old.md']);
  });

  test('respects excludes — excluded paths are treated as not visible', () => {
    const tree = [treeItem('public/page.md'), treeItem('private/secret.md')];
    const existingPaths = ['public/page.md', 'private/secret.md'];

    const paths = computeFilesToDelete({ tree, existingPaths, excludes: ['/private'] });

    assert.deepStrictEqual(paths, ['private/secret.md']);
  });
});
