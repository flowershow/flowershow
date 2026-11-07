import { describe, expect, it } from 'vitest';
import { resolveTocStyle } from './toc-style';

describe('resolveTocStyle', () => {
  it('defaults to panel', () => {
    expect(resolveTocStyle(undefined, undefined)).toBe('panel');
  });

  it('uses the site style', () => {
    expect(resolveTocStyle(undefined, { style: 'rail' })).toBe('rail');
  });

  it('lets the page override the site', () => {
    expect(resolveTocStyle({ style: 'panel' }, { style: 'rail' })).toBe(
      'panel',
    );
    expect(resolveTocStyle({ style: 'rail' }, undefined)).toBe('rail');
  });

  it('ignores an invalid page value and falls through to the site', () => {
    expect(resolveTocStyle({ style: 'ticks' }, { style: 'rail' })).toBe('rail');
  });

  it('ignores non-object values', () => {
    expect(resolveTocStyle('rail', null)).toBe('panel');
  });
});
