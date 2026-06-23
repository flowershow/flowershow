import { expect, test } from 'vitest';
import {
  extractImageDimensions,
  extractLinks,
  extractTitle,
  isSupportedImagePath,
  normalizePermalink,
  parseMarkdown,
  parseObjectKey,
} from '../../src/queue-consumer.js';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx9QAAAAASUVORK5CYII=';

test('extractTitle - basic H1 heading', async () => {
  const markdown = '# Simple Title\n\nSome content here.';
  const result = await extractTitle(markdown);
  expect(result).toBe('Simple Title');
});

test('extractTitle - H1 heading with leading whitespace', async () => {
  const markdown = '   # Title with Leading Spaces\n\nContent follows.';
  const result = await extractTitle(markdown);
  expect(result).toBe('Title with Leading Spaces');
});

test('extractTitle - H1 heading with trailing whitespace', async () => {
  const markdown = '# Title with Trailing Spaces   \n\nContent follows.';
  const result = await extractTitle(markdown);
  expect(result).toBe('Title with Trailing Spaces');
});

test('extractTitle - removes wikilinks', async () => {
  const markdown = '# Title with [[Wikilink]] in it\n\nContent here.';
  const result = await extractTitle(markdown);
  expect(result).toBe('Title with Wikilink in it');
});

test('extractTitle - removes common mark links but keeps text', async () => {
  const markdown =
    '# Title with [link text](https://example.com) in it\n\nContent.';
  const result = await extractTitle(markdown);
  expect(result).toBe('Title with link text in it');
});

test('extractTitle - removes markdown formatting characters', async () => {
  const markdown =
    '# Title with *bold* and _italic_ and ~strikethrough~ and `code`\n\nContent.';
  const result = await extractTitle(markdown);
  expect(result).toBe('Title with bold and italic and strikethrough and code');
});

test('extractTitle - content before H1', async () => {
  const markdown = 'Some text\n# This is the title\n\nMore content.';
  const result = await extractTitle(markdown);
  expect(result).toBeNull();
});

test('extractTitle - multiple H1 headings returns first one', async () => {
  const markdown =
    '# First Title\n\nSome content.\n\n# Second Title\n\nMore content.';
  const result = await extractTitle(markdown);
  expect(result).toBe('First Title');
});

test('extractTitle - no H1 heading returns null', async () => {
  const markdown = '## H2 Heading\n\nSome content without H1.';
  const result = await extractTitle(markdown);
  expect(result).toBeNull();
});

test('extractTitle - empty string returns null', async () => {
  const markdown = '';
  const result = await extractTitle(markdown);
  expect(result).toBeNull();
});

test('extractTitle - H1 with only hash symbol returns null', async () => {
  const markdown = '#\n\nContent here.';
  const result = await extractTitle(markdown);
  expect(result).toBeNull();
});

test('normalizePermalink normalizes to leading slash, no trailing slash', () => {
  expect(normalizePermalink('/docs/page/')).toBe('/docs/page');
  expect(normalizePermalink('docs/page')).toBe('/docs/page');
  expect(normalizePermalink('/')).toBeNull();
  expect(normalizePermalink(undefined)).toBeNull();
});

test('parseMarkdown defaults publish to true', async () => {
  const { metadata, permalink, shouldPublish } = await parseMarkdown({
    markdown: '# Hello',
    path: 'hello.md',
  });

  expect(metadata.title).toBe('Hello');
  expect(metadata.publish).toBe(true);
  expect(permalink).toBeNull();
  expect(shouldPublish).toBe(true);
});

test('parseMarkdown preserves explicit publish false and normalizes permalink', async () => {
  const markdown = `---\npublish: false\npermalink: /posts/intro/\n---\n# Intro`;
  const { metadata, permalink, shouldPublish } = await parseMarkdown({
    markdown,
    path: 'intro.md',
  });

  expect(metadata.publish).toBe(false);
  expect(permalink).toBe('/posts/intro');
  expect(shouldPublish).toBe(false);
});

test('isSupportedImagePath supports normalized image extensions', () => {
  expect(isSupportedImagePath('photo.jpg')).toBe(true);
  expect(isSupportedImagePath('photo.jpeg')).toBe(true);
  expect(isSupportedImagePath('scan.tif')).toBe(true);
  expect(isSupportedImagePath('scan.tiff')).toBe(true);
  expect(isSupportedImagePath('notes.md')).toBe(false);
});

test('extractImageDimensions returns dimensions for supported image', () => {
  const buffer = Buffer.from(TINY_PNG_BASE64, 'base64');
  const result = extractImageDimensions('tiny.png', buffer);

  expect(result).toEqual({ width: 1, height: 1 });
});

test('extractImageDimensions returns nulls for unsupported file type', () => {
  const result = extractImageDimensions('README.md', Buffer.from('# Hello'));

  expect(result).toEqual({ width: null, height: null });
});

test('parseMarkdown falls back to filename when no frontmatter title and no H1', async () => {
  const { metadata } = await parseMarkdown({
    markdown: 'Just some content without a heading.',
    path: 'docs/my-page.md',
  });

  expect(metadata.title).toBe('my-page');
});

test('parseMarkdown prefers frontmatter title over H1', async () => {
  const markdown = '---\ntitle: Frontmatter Title\n---\n# H1 Title';
  const { metadata } = await parseMarkdown({
    markdown,
    path: 'page.md',
  });

  expect(metadata.title).toBe('Frontmatter Title');
});

test('parseObjectKey parses valid key format', () => {
  const result = parseObjectKey('site-1/main/raw/docs/intro.md');

  expect(result).toEqual({
    siteId: 'site-1',
    branch: 'main',
    path: 'docs/intro.md',
  });
});

test('parseObjectKey parses key with nested path', () => {
  const result = parseObjectKey('mysite/feat-branch/raw/a/b/c/file.md');

  expect(result).toEqual({
    siteId: 'mysite',
    branch: 'feat-branch',
    path: 'a/b/c/file.md',
  });
});

test('parseObjectKey throws on invalid format', () => {
  expect(() => parseObjectKey('invalid-key-without-raw-segment')).toThrow(
    /Invalid key format/,
  );
});

test('parseObjectKey throws when raw segment is missing', () => {
  expect(() => parseObjectKey('site/branch/notraw/file.md')).toThrow(
    /Invalid key format/,
  );
});

// extractLinks

test('extractLinks - empty string returns empty array', () => {
  expect(extractLinks('')).toEqual([]);
});

test('extractLinks - basic embed ![[note]]', () => {
  expect(extractLinks('![[my-note]]')).toEqual([
    { targetPath: 'my-note', linkType: 'embed' },
  ]);
});

test('extractLinks - embed with alias strips alias', () => {
  expect(extractLinks('![[my-note|Display Name]]')).toEqual([
    { targetPath: 'my-note', linkType: 'embed' },
  ]);
});

test('extractLinks - embed with heading strips heading', () => {
  expect(extractLinks('![[my-note#Introduction]]')).toEqual([
    { targetPath: 'my-note', linkType: 'embed' },
  ]);
});

test('extractLinks - basic wikilink [[note]]', () => {
  expect(extractLinks('[[my-note]]')).toEqual([
    { targetPath: 'my-note', linkType: 'wikilink' },
  ]);
});

test('extractLinks - wikilink with alias strips alias', () => {
  expect(extractLinks('[[my-note|Display Name]]')).toEqual([
    { targetPath: 'my-note', linkType: 'wikilink' },
  ]);
});

test('extractLinks - wikilink with heading strips heading', () => {
  expect(extractLinks('[[my-note#Introduction]]')).toEqual([
    { targetPath: 'my-note', linkType: 'wikilink' },
  ]);
});

test('extractLinks - embed is not also captured as wikilink', () => {
  const links = extractLinks('![[my-note]]');
  expect(links).toHaveLength(1);
  expect(links[0].targetPath).toBe('my-note');
  expect(links[0].linkType).toBe('embed');
});

test('extractLinks - embed with .md extension is included', () => {
  expect(extractLinks('![[my-note.md]]')).toEqual([
    { targetPath: 'my-note.md', linkType: 'embed' },
  ]);
});

test('extractLinks - embed of image file is excluded', () => {
  expect(extractLinks('![[photo.png]]')).toEqual([]);
});

test('extractLinks - embed of video file is excluded', () => {
  expect(extractLinks('![[screencast.mp4]]')).toEqual([]);
});

test('extractLinks - embed of pdf is excluded', () => {
  expect(extractLinks('![[document.pdf]]')).toEqual([]);
});

test('extractLinks - commonmark internal link', () => {
  expect(extractLinks('[text](docs/page.md)')).toEqual([
    { targetPath: 'docs/page.md', linkType: 'commonmark' },
  ]);
});

test('extractLinks - commonmark link with fragment strips fragment', () => {
  expect(extractLinks('[text](docs/page.md#section)')).toEqual([
    { targetPath: 'docs/page.md', linkType: 'commonmark' },
  ]);
});

test('extractLinks - commonmark link with title attribute strips title', () => {
  expect(extractLinks('[text](docs/page.md "Page Title")')).toEqual([
    { targetPath: 'docs/page.md', linkType: 'commonmark' },
  ]);
});

test('extractLinks - commonmark https link is excluded', () => {
  expect(extractLinks('[text](https://example.com)')).toEqual([]);
});

test('extractLinks - commonmark http link is excluded', () => {
  expect(extractLinks('[text](http://example.com)')).toEqual([]);
});

test('extractLinks - commonmark mailto link is excluded', () => {
  expect(extractLinks('[text](mailto:user@example.com)')).toEqual([]);
});

test('extractLinks - commonmark fragment-only link is excluded', () => {
  expect(extractLinks('[text](#section)')).toEqual([]);
});

test('extractLinks - commonmark image embed is excluded', () => {
  expect(extractLinks('![alt text](image.png)')).toEqual([]);
});

test('extractLinks - links inside fenced code blocks are ignored', () => {
  const markdown = '```\n[[wikilink]]\n![[embed]]\n[text](page.md)\n```';
  expect(extractLinks(markdown)).toEqual([]);
});

test('extractLinks - links inside inline code are ignored', () => {
  const markdown = 'Use `[[wikilink]]` and `[text](page.md)` syntax.';
  expect(extractLinks(markdown)).toEqual([]);
});

test('extractLinks - deduplicates by targetPath keeping first occurrence', () => {
  const markdown = '[[note]] and [[note|alias]]';
  const links = extractLinks(markdown);
  expect(links).toHaveLength(1);
  expect(links[0]).toEqual({ targetPath: 'note', linkType: 'wikilink' });
});

test('extractLinks - wikilink with escaped pipe alias in table strips backslash and alias', () => {
  expect(extractLinks('| [[some-file\\|some alias]] |')).toEqual([
    { targetPath: 'some-file', linkType: 'wikilink' },
  ]);
});

test('extractLinks - embed with escaped pipe alias in table strips backslash and alias', () => {
  expect(extractLinks('| ![[some-file\\|some alias]] |')).toEqual([
    { targetPath: 'some-file', linkType: 'embed' },
  ]);
});

test('extractLinks - returns all three link types from mixed content', () => {
  const markdown =
    '![[some-note]] See [[other-note]] and [text](docs/page.md) for details.';
  expect(extractLinks(markdown)).toEqual([
    { targetPath: 'some-note', linkType: 'embed' },
    { targetPath: 'other-note', linkType: 'wikilink' },
    { targetPath: 'docs/page.md', linkType: 'commonmark' },
  ]);
});
