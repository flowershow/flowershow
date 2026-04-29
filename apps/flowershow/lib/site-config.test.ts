import { describe, expect, it } from 'vitest';
import { resolveSiteConfig } from './site-config';

describe('resolveSiteConfig', () => {
  it('returns empty object when all inputs are null', () => {
    expect(resolveSiteConfig(null, null)).toEqual({});
  });

  it('returns dbConfig when fileConfig is null', () => {
    const db = { title: 'From DB', showToc: true };
    expect(resolveSiteConfig(db, null)).toEqual({
      title: 'From DB',
      showToc: true,
    });
  });

  it('returns fileConfig when dbConfig is null', () => {
    const file = { title: 'From File', showToc: false };
    expect(resolveSiteConfig(null, file)).toEqual({
      title: 'From File',
      showToc: false,
    });
  });

  it('fileConfig scalar fields override dbConfig', () => {
    const db = { title: 'DB Title', showToc: true };
    const file = { title: 'File Title' };
    const result = resolveSiteConfig(db, file);
    expect(result.title).toBe('File Title');
    expect(result.showToc).toBe(true); // DB value preserved when file doesn't set it
  });

  it('deep merges nested objects: fileConfig.nav overrides dbConfig.nav keys', () => {
    const db = { nav: { title: 'DB Nav Title', logo: '/logo.png' } };
    const file = { nav: { title: 'File Nav Title' } };
    const result = resolveSiteConfig(db, file);
    expect(result.nav?.title).toBe('File Nav Title');
    expect(result.nav?.logo).toBe('/logo.png'); // DB key preserved when file doesn't set it
  });

  it('deep merges theme objects', () => {
    const db = {
      theme: {
        theme: 'dark',
        defaultMode: 'light' as const,
        showModeSwitch: true,
      },
    };
    const file = { theme: { defaultMode: 'dark' as const } };
    const result = resolveSiteConfig(db, file);
    expect(result.theme).toEqual({
      theme: 'dark',
      defaultMode: 'dark',
      showModeSwitch: true,
    });
  });

  it('fileConfig arrays completely replace dbConfig arrays', () => {
    const db = { contentInclude: ['notes/', 'blog/'] };
    const file = { contentInclude: ['posts/'] };
    const result = resolveSiteConfig(db, file);
    expect(result.contentInclude).toEqual(['posts/']);
  });

  it('handles fileConfig theme as string overriding db theme object', () => {
    const db = { theme: { theme: 'midnight', defaultMode: 'dark' as const } };
    const file = { theme: 'forest' };
    const result = resolveSiteConfig(db, file);
    expect(result.theme).toBe('forest');
  });
});
