import { test } from 'node:test';
import assert from 'node:assert';
import { extractTitle } from '../src/parser.js';

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
