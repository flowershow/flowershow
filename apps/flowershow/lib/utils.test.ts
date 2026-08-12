import { describe, expect, it } from 'vitest';
import { normalizeAuthors, safeDate } from './utils';

describe('safeDate', () => {
  it('parses a valid ISO date string', () => {
    const result = safeDate('2024-01-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-01-15T00:00:00.000Z');
  });

  it('parses a Date instance', () => {
    const input = new Date('2024-01-15T00:00:00.000Z');
    expect(safeDate(input)?.getTime()).toBe(input.getTime());
  });

  it('returns null for a Zotero-style date range', () => {
    // Regression: "1964-1982" previously threw RangeError via .toISOString()
    expect(safeDate('1964-1982')).toBeNull();
  });

  it('returns null for free-text dates', () => {
    expect(safeDate('forthcoming')).toBeNull();
    expect(safeDate('date')).toBeNull();
  });

  it('returns null for null, undefined, and empty string', () => {
    expect(safeDate(null)).toBeNull();
    expect(safeDate(undefined)).toBeNull();
    expect(safeDate('')).toBeNull();
  });

  it('does not throw for any input', () => {
    expect(() => safeDate({})).not.toThrow();
    expect(() => safeDate([])).not.toThrow();
    expect(safeDate({})).toBeNull();
  });
});

describe('normalizeAuthors', () => {
  it('coerces a single scalar author to a one-item list', () => {
    // Regression: `authors: Jane` previously threw a ZodError and crashed render
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

  it('returns an empty list for malformed shapes without throwing', () => {
    expect(() => normalizeAuthors({ foo: 'bar' })).not.toThrow();
    expect(normalizeAuthors({ foo: 'bar' })).toEqual([]);
    expect(normalizeAuthors(2023)).toEqual([]);
  });
});
