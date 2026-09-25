import { describe, expect, test } from 'vitest';
import {
  extractInlineTags,
  frontmatterTags,
  matchInlineTags,
  mergePageTags,
  mergeTags,
  normalizeFrontmatterTags,
  tagFromHref,
  tagIdentity,
  tagMatches,
  tagToHref,
} from './tags';

describe('normalizeFrontmatterTags', () => {
  test('YAML list', () => {
    expect(normalizeFrontmatterTags(['book', 'fiction'])).toEqual([
      'book',
      'fiction',
    ]);
  });

  test('single string', () => {
    expect(normalizeFrontmatterTags('book')).toEqual(['book']);
  });

  test('space-separated string', () => {
    expect(normalizeFrontmatterTags('book fiction')).toEqual([
      'book',
      'fiction',
    ]);
  });

  test('comma-separated string', () => {
    expect(normalizeFrontmatterTags('book, fiction')).toEqual([
      'book',
      'fiction',
    ]);
  });

  test('strips leading # (Obsidian frontmatter form)', () => {
    expect(normalizeFrontmatterTags(['#book', '#book/fiction'])).toEqual([
      'book',
      'book/fiction',
    ]);
  });

  test('preserves nested tags and casing', () => {
    expect(normalizeFrontmatterTags(['Book/Fiction'])).toEqual([
      'Book/Fiction',
    ]);
  });

  test('null / undefined / empty', () => {
    expect(normalizeFrontmatterTags(null)).toEqual([]);
    expect(normalizeFrontmatterTags(undefined)).toEqual([]);
    expect(normalizeFrontmatterTags('')).toEqual([]);
    expect(normalizeFrontmatterTags([])).toEqual([]);
  });
});

describe('frontmatterTags — tags vs tag key', () => {
  test('reads tags key', () => {
    expect(frontmatterTags({ tags: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  test('reads tag key when tags absent', () => {
    expect(frontmatterTags({ tag: 'solo' })).toEqual(['solo']);
  });

  test('tags takes precedence over tag', () => {
    expect(frontmatterTags({ tags: ['a'], tag: 'b' })).toEqual(['a']);
  });

  test('no metadata', () => {
    expect(frontmatterTags(null)).toEqual([]);
    expect(frontmatterTags(undefined)).toEqual([]);
    expect(frontmatterTags({})).toEqual([]);
  });
});

describe('extractInlineTags — Obsidian grammar', () => {
  test('basic tag at start of line', () => {
    expect(extractInlineTags('#book is great')).toEqual(['book']);
  });

  test('tag after whitespace mid-line', () => {
    expect(extractInlineTags('I love #book here')).toEqual(['book']);
  });

  test('nested tag', () => {
    expect(extractInlineTags('#book/fiction')).toEqual(['book/fiction']);
  });

  test('underscore and hyphen allowed', () => {
    expect(extractInlineTags('#my_tag #2024-review')).toEqual([
      'my_tag',
      '2024-review',
    ]);
  });

  test('numeric-only tokens are NOT tags', () => {
    expect(extractInlineTags('issue #1 and #123')).toEqual([]);
  });

  test('numeric-only nested token is NOT a tag', () => {
    expect(extractInlineTags('#1/2')).toEqual([]);
  });

  test('markdown heading is NOT a tag', () => {
    expect(extractInlineTags('# Heading\n## Sub')).toEqual([]);
  });

  test('URL fragment is NOT a tag', () => {
    expect(extractInlineTags('see https://example.com/#anchor')).toEqual([]);
  });

  test('mid-word hex color is NOT a tag', () => {
    expect(extractInlineTags('color is abc#fff today')).toEqual([]);
  });

  test('inline code is ignored', () => {
    expect(extractInlineTags('use `#book` in code, then #real')).toEqual([
      'real',
    ]);
  });

  test('fenced code block is ignored', () => {
    const md = ['```', '#notatag', '```', '', '#realtag'].join('\n');
    expect(extractInlineTags(md)).toEqual(['realtag']);
  });

  test('stops at punctuation', () => {
    expect(extractInlineTags('end of #book. Next #film!')).toEqual([
      'book',
      'film',
    ]);
  });

  test('multiple tags including duplicates preserves order (dedup is merge job)', () => {
    expect(extractInlineTags('#a #b #a')).toEqual(['a', 'b', 'a']);
  });
});

describe('matchInlineTags — positions', () => {
  test('reports index and length of the full match', () => {
    const matches = matchInlineTags('hi #book bye');
    expect(matches).toEqual([{ tag: 'book', index: 3, length: 5 }]);
  });

  test('multiple matches', () => {
    const matches = matchInlineTags('#a and #bc');
    expect(matches.map((m) => m.tag)).toEqual(['a', 'bc']);
    expect(matches[1]).toMatchObject({ index: 7, length: 3 });
  });
});

describe('tagIdentity', () => {
  test('case-folds and strips #', () => {
    expect(tagIdentity('#Book')).toBe('book');
    expect(tagIdentity('BOOK')).toBe('book');
    expect(tagIdentity('  Book/Fiction ')).toBe('book/fiction');
  });
});

describe('mergePageTags — union, dedup by identity, first-seen casing', () => {
  test('unions frontmatter and inline', () => {
    expect(mergePageTags(['book'], ['film'])).toEqual([
      { tag: 'book', source: 'frontmatter' },
      { tag: 'film', source: 'inline' },
    ]);
  });

  test('dedups by case-folded identity, frontmatter casing/source wins', () => {
    expect(mergePageTags(['Book'], ['book'])).toEqual([
      { tag: 'Book', source: 'frontmatter' },
    ]);
  });

  test('inline-only tag keeps inline source', () => {
    expect(mergePageTags([], ['Film', 'film'])).toEqual([
      { tag: 'Film', source: 'inline' },
    ]);
  });

  test('mergeTags returns display strings', () => {
    expect(mergeTags(['Book'], ['film', 'Book'])).toEqual(['Book', 'film']);
  });
});

describe('tagMatches — nested-aware, case-insensitive', () => {
  test('exact match', () => {
    expect(tagMatches(['book'], 'book')).toBe(true);
  });

  test('parent matches descendant', () => {
    expect(tagMatches(['book/fiction'], 'book')).toBe(true);
  });

  test('descendant does not match unrelated parent', () => {
    expect(tagMatches(['booklet'], 'book')).toBe(false);
  });

  test('case-insensitive', () => {
    expect(tagMatches(['Book/Fiction'], 'book')).toBe(true);
    expect(tagMatches(['book'], '#BOOK')).toBe(true);
  });

  test('no match', () => {
    expect(tagMatches(['film'], 'book')).toBe(false);
    expect(tagMatches([], 'book')).toBe(false);
    expect(tagMatches(['book'], '')).toBe(false);
  });
});

describe('tagToHref', () => {
  test('simple tag', () => {
    expect(tagToHref('book')).toBe('/tags/book');
  });

  test('nested tag becomes path segments', () => {
    expect(tagToHref('book/fiction')).toBe('/tags/book/fiction');
  });

  test('strips leading #', () => {
    expect(tagToHref('#book')).toBe('/tags/book');
  });

  test('encodes special characters per segment', () => {
    expect(tagToHref('café/résumé')).toBe('/tags/caf%C3%A9/r%C3%A9sum%C3%A9');
  });
});

describe('tagFromHref — inverse of tagToHref', () => {
  test('decodes a percent-encoded segment', () => {
    expect(tagFromHref('caf%C3%A9')).toBe('café');
  });

  test('leaves an unencoded segment untouched', () => {
    expect(tagFromHref('book')).toBe('book');
  });

  test('preserves nested path separators', () => {
    expect(tagFromHref('book/fiction')).toBe('book/fiction');
  });

  test('falls back to the raw segment on malformed encoding', () => {
    expect(tagFromHref('%E0%A4%A')).toBe('%E0%A4%A');
    expect(tagFromHref('100%')).toBe('100%');
  });

  test.each(['book', 'book/fiction', 'café', 'café/résumé', '2024-review'])(
    'round-trips with tagToHref: %s',
    (tag) => {
      const segment = tagToHref(tag).slice('/tags/'.length);
      expect(tagFromHref(segment)).toBe(tag);
    },
  );
});
