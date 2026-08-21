import { describe, expect, it } from 'vitest';

import { getThemeUrl } from './get-theme';

describe('getThemeUrl', () => {
  it('resolves bare Monospace to the ref that contains the official theme', () => {
    expect(getThemeUrl('monospace')).toBe(
      'https://cdn.jsdelivr.net/gh/flowershow/themes@main/monospace/theme.css',
    );
  });

  it('keeps explicit Monospace version pins authoritative', () => {
    expect(getThemeUrl('monospace@0.2.0')).toBe(
      'https://cdn.jsdelivr.net/gh/flowershow/themes@0.2.0/monospace/theme.css',
    );
  });

  it('keeps established bare themes on jsDelivr default resolution', () => {
    expect(getThemeUrl('letterpress')).toBe(
      'https://cdn.jsdelivr.net/gh/flowershow/themes/letterpress/theme.css',
    );
  });
});
