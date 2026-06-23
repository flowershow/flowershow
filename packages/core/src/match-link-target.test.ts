import { describe, expect, test } from 'vitest';
import { matchLinkTarget } from './match-link-target';

const files = [
  { path: '/blog/README.md' },
  { path: '/blog/about.mdx' },
  { path: '/blog/guide/post.mdx' },
  { path: '/blog/post.md' },
  { path: '/README.mdx' },
  { path: '/about.md' },
  { path: '/docs/README.md' },
];

describe('shortestPossible format (default)', () => {
  test('matches by basename', () => {
    expect(matchLinkTarget('post', files)?.path).toBe('/blog/post.md');
  });

  test('picks shortest when multiple suffix matches exist', () => {
    expect(matchLinkTarget('README', files)?.path).toBe('/README.mdx');
  });

  test('matches partial path suffix', () => {
    expect(matchLinkTarget('guide/post', files)?.path).toBe('/blog/guide/post.mdx');
  });

  test('returns undefined for no match', () => {
    expect(matchLinkTarget('nonexistent', files)).toBeUndefined();
  });

  test('returns undefined for empty target', () => {
    expect(matchLinkTarget('', files)).toBeUndefined();
  });

  test('strips .md extension from target', () => {
    expect(matchLinkTarget('post.md', files)?.path).toBe('/blog/post.md');
  });

  test('strips extension from target before matching', () => {
    // /about.md and /blog/about.mdx both match 'about' after ext stripping;
    // shortest path wins
    expect(matchLinkTarget('about.mdx', files)?.path).toBe('/about.md');
  });

  test('matches absolute target', () => {
    expect(matchLinkTarget('/about', files)?.path).toBe('/about.md');
  });
});

describe('exact format', () => {
  test('finds exact match', () => {
    expect(matchLinkTarget('/about', files, { format: 'exact' })?.path).toBe('/about.md');
  });

  test('does not match by suffix in exact format', () => {
    expect(matchLinkTarget('post', files, { format: 'exact' })).toBeUndefined();
  });

  test('returns undefined for no match', () => {
    expect(matchLinkTarget('/nonexistent', files, { format: 'exact' })).toBeUndefined();
  });
});

describe('case sensitivity', () => {
  const mixedFiles = [
    { path: '/Blog/About.mdx' },
    { path: '/README.mdx' },
    { path: '/Blog/Guide/Post.mdx' },
  ];

  test('matches case-insensitively by default', () => {
    expect(matchLinkTarget('about', mixedFiles)?.path).toBe('/Blog/About.mdx');
  });

  test('matches case-insensitively in exact format', () => {
    expect(matchLinkTarget('/blog/about', mixedFiles, { format: 'exact' })?.path).toBe('/Blog/About.mdx');
  });

  test('matches mixed-case target', () => {
    expect(matchLinkTarget('guide/POST', mixedFiles)?.path).toBe('/Blog/Guide/Post.mdx');
  });

  test('returns undefined with case-sensitive option and wrong case', () => {
    expect(matchLinkTarget('readme', mixedFiles, { caseInsensitive: false })).toBeUndefined();
  });

  test('finds exact case match when case-sensitive', () => {
    expect(matchLinkTarget('README', mixedFiles, { caseInsensitive: false })?.path).toBe('/README.mdx');
  });
});

describe('generic type — returns caller type', () => {
  test('returns full record including id', () => {
    const blobs = [
      { id: 'abc', path: '/docs/guide.md' },
      { id: 'xyz', path: '/blog/post.md' },
    ];
    const match = matchLinkTarget('guide', blobs);
    expect(match?.id).toBe('abc');
  });
});
