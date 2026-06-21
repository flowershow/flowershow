import assert from 'node:assert';
import { test } from 'node:test';
import {
  extractImageDimensions,
  extractTitle,
  isSupportedImagePath,
  normalizePermalink,
  parseMarkdown,
  parseObjectKey,
} from '../src/queue-consumer.js';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx9QAAAAASUVORK5CYII=';

test('extractTitle - basic H1 heading', async () => {
  const markdown = '# Simple Title\n\nSome content here.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, 'Simple Title');
});

test('extractTitle - H1 heading with leading whitespace', async () => {
  const markdown = '   # Title with Leading Spaces\n\nContent follows.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, 'Title with Leading Spaces');
});

test('extractTitle - H1 heading with trailing whitespace', async () => {
  const markdown = '# Title with Trailing Spaces   \n\nContent follows.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, 'Title with Trailing Spaces');
});

test('extractTitle - removes wikilinks', async () => {
  const markdown = '# Title with [[Wikilink]] in it\n\nContent here.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, 'Title with Wikilink in it');
});

test('extractTitle - removes common mark links but keeps text', async () => {
  const markdown =
    '# Title with [link text](https://example.com) in it\n\nContent.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, 'Title with link text in it');
});

test('extractTitle - removes markdown formatting characters', async () => {
  const markdown =
    '# Title with *bold* and _italic_ and ~strikethrough~ and `code`\n\nContent.';
  const result = await extractTitle(markdown);
  assert.strictEqual(
    result,
    'Title with bold and italic and strikethrough and code',
  );
});

test('extractTitle - content before H1', async () => {
  const markdown = 'Some text\n# This is the title\n\nMore content.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, null);
});

test('extractTitle - multiple H1 headings returns first one', async () => {
  const markdown =
    '# First Title\n\nSome content.\n\n# Second Title\n\nMore content.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, 'First Title');
});

test('extractTitle - no H1 heading returns null', async () => {
  const markdown = '## H2 Heading\n\nSome content without H1.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, null);
});

test('extractTitle - empty string returns null', async () => {
  const markdown = '';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, null);
});

test('extractTitle - H1 with only hash symbol returns null', async () => {
  const markdown = '#\n\nContent here.';
  const result = await extractTitle(markdown);
  assert.strictEqual(result, null);
});

test('normalizePermalink normalizes to leading slash, no trailing slash', () => {
  assert.strictEqual(normalizePermalink('/docs/page/'), '/docs/page');
  assert.strictEqual(normalizePermalink('docs/page'), '/docs/page');
  assert.strictEqual(normalizePermalink('/'), null);
  assert.strictEqual(normalizePermalink(undefined), null);
});

test('parseMarkdown defaults publish to true', async () => {
  const { metadata, permalink, shouldPublish } = await parseMarkdown({
    markdown: '# Hello',
    path: 'hello.md',
  });

  assert.strictEqual(metadata.title, 'Hello');
  assert.strictEqual(metadata.publish, true);
  assert.strictEqual(permalink, null);
  assert.strictEqual(shouldPublish, true);
});

test('parseMarkdown preserves explicit publish false and normalizes permalink', async () => {
  const markdown = `---\npublish: false\npermalink: /posts/intro/\n---\n# Intro`;
  const { metadata, permalink, shouldPublish } = await parseMarkdown({
    markdown,
    path: 'intro.md',
  });

  assert.strictEqual(metadata.publish, false);
  assert.strictEqual(permalink, '/posts/intro');
  assert.strictEqual(shouldPublish, false);
});

test('isSupportedImagePath supports normalized image extensions', () => {
  assert.strictEqual(isSupportedImagePath('photo.jpg'), true);
  assert.strictEqual(isSupportedImagePath('photo.jpeg'), true);
  assert.strictEqual(isSupportedImagePath('scan.tif'), true);
  assert.strictEqual(isSupportedImagePath('scan.tiff'), true);
  assert.strictEqual(isSupportedImagePath('notes.md'), false);
});

test('extractImageDimensions returns dimensions for supported image', () => {
  const buffer = Buffer.from(TINY_PNG_BASE64, 'base64');
  const result = extractImageDimensions('tiny.png', buffer);

  assert.deepStrictEqual(result, { width: 1, height: 1 });
});

test('extractImageDimensions returns nulls for unsupported file type', () => {
  const result = extractImageDimensions('README.md', Buffer.from('# Hello'));

  assert.deepStrictEqual(result, { width: null, height: null });
});

test('parseMarkdown falls back to filename when no frontmatter title and no H1', async () => {
  const { metadata } = await parseMarkdown({
    markdown: 'Just some content without a heading.',
    path: 'docs/my-page.md',
  });

  assert.strictEqual(metadata.title, 'my-page');
});

test('parseMarkdown prefers frontmatter title over H1', async () => {
  const markdown = '---\ntitle: Frontmatter Title\n---\n# H1 Title';
  const { metadata } = await parseMarkdown({
    markdown,
    path: 'page.md',
  });

  assert.strictEqual(metadata.title, 'Frontmatter Title');
});

test('parseObjectKey parses valid key format', () => {
  const result = parseObjectKey('site-1/main/raw/docs/intro.md');

  assert.deepStrictEqual(result, {
    siteId: 'site-1',
    branch: 'main',
    path: 'docs/intro.md',
  });
});

test('parseObjectKey parses key with nested path', () => {
  const result = parseObjectKey('mysite/feat-branch/raw/a/b/c/file.md');

  assert.deepStrictEqual(result, {
    siteId: 'mysite',
    branch: 'feat-branch',
    path: 'a/b/c/file.md',
  });
});

test('parseObjectKey throws on invalid format', () => {
  assert.throws(
    () => parseObjectKey('invalid-key-without-raw-segment'),
    /Invalid key format/,
  );
});

test('parseObjectKey throws when raw segment is missing', () => {
  assert.throws(
    () => parseObjectKey('site/branch/notraw/file.md'),
    /Invalid key format/,
  );
});
