import { describe, expect, it } from 'vitest';
import { formatListingDate, groupLabel, resolveLocale } from './dates';

describe('dates', () => {
  it('resolveLocale takes the first valid tag', () => {
    expect(resolveLocale(undefined, 'de-DE', 'fr')).toBe('de-DE');
    expect(resolveLocale('not a locale!!', null)).toBe('en-US');
    expect(resolveLocale()).toBe('en-US');
  });
  it('formats in the locale, in UTC', () => {
    expect(formatListingDate('2026-09-18', 'en-US')).toBe('Sep 18, 2026');
    expect(formatListingDate('2026-09-18', 'de-DE')).toBe('18. Sept. 2026');
  });
  it('group labels', () => {
    expect(groupLabel('2026', { by: 'year' }, 'en-US')).toBe('2026');
    expect(groupLabel('2026-09', { by: 'month' }, 'en-US')).toBe(
      'September 2026',
    );
    expect(groupLabel('2026-09', { by: 'month' }, 'de-DE')).toBe(
      'September 2026',
    );
    expect(groupLabel('2026-09-18', { by: 'day' }, 'en-US')).toBe(
      'Sep 18, 2026',
    );
    expect(groupLabel('', { by: 'year' }, 'en-US')).toBe('Undated');
    expect(groupLabel('tutorials', { by: 'folder' }, 'en-US')).toBe(
      'Tutorials',
    );
    expect(
      groupLabel('Shipped', { by: 'field', field: 'status' }, 'en-US'),
    ).toBe('Shipped');
    expect(groupLabel('', { by: 'field', field: 'status' }, 'en-US')).toBe(
      'Other',
    );
  });
});
