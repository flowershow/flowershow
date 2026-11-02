import { describe, expect, it } from 'vitest';
import { normalizeAuthors } from './authors';

describe('normalizeAuthors', () => {
  it('coerces a single scalar author to a one-item list', () => {
    // Regression: `authors: Jane` crashed page render (ZodError) and was
    // rejected by the search index (`authors` is string[])
    expect(normalizeAuthors('Jane')).toEqual(['Jane']);
  });

  it('passes through a list of author strings', () => {
    expect(normalizeAuthors(['Jane', 'Bob'])).toEqual(['Jane', 'Bob']);
  });

  it('keeps wikilink-style entries intact', () => {
    expect(normalizeAuthors('[[Jane Doe]]')).toEqual(['[[Jane Doe]]']);
  });

  it('drops empty, whitespace-only, and non-string entries', () => {
    expect(normalizeAuthors(['Jane', '', '   ', null, 42, 'Bob'])).toEqual([
      'Jane',
      'Bob',
    ]);
  });

  it('returns an empty list for null, undefined, and empty string', () => {
    expect(normalizeAuthors(null)).toEqual([]);
    expect(normalizeAuthors(undefined)).toEqual([]);
    expect(normalizeAuthors('')).toEqual([]);
    expect(normalizeAuthors('   ')).toEqual([]);
  });

  it('returns an empty list for malformed shapes', () => {
    expect(normalizeAuthors({ foo: 'bar' })).toEqual([]);
    expect(normalizeAuthors(2023)).toEqual([]);
  });
});
