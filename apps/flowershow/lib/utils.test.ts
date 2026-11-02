import { describe, expect, it } from 'vitest';
import { safeDate } from './utils';

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
