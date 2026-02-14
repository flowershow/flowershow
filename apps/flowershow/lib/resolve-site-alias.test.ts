import { describe, expect, it, vi } from 'vitest';

vi.mock('./app-config', () => ({
  getConfig: () => ({
    siteAliases: [
      { origin: '/@olayway/blog', alias: '/blog' },
      { origin: '/@olayway/docs', alias: '/docs' },
      { origin: '/@olayway/collections', alias: '/collections' },
      { origin: '/@rufuspollock/data-notes', alias: '/notes' },
      { origin: '/@olayway/co2-ppm', alias: '/core/co2-ppm' },
    ],
  }),
}));

import { resolveSiteAlias } from './resolve-site-alias';

describe('resolve special site alias to origin', () => {
  it('/blog', () => {
    const s = '/blog';
    const expected = `/@olayway/blog`;
    const resolved = resolveSiteAlias(s, 'from');
    expect(resolved).toBe(expected);
  });

  it('/docs', () => {
    const s = '/docs';
    const expected = `/@olayway/docs`;
    const resolved = resolveSiteAlias(s, 'from');
    expect(resolved).toBe(expected);
  });

  it('/collections', () => {
    const s = '/collections';
    const expected = `/@olayway/collections`;
    const resolved = resolveSiteAlias(s, 'from');
    expect(resolved).toBe(expected);
  });

  it('/notes', () => {
    const s = '/notes';
    const expected = `/@rufuspollock/data-notes`;
    const resolved = resolveSiteAlias(s, 'from');
    expect(resolved).toBe(expected);
  });

  it('/core', () => {
    const s = '/core/co2-ppm';
    const expected = `/@olayway/co2-ppm`;
    const resolved = resolveSiteAlias(s, 'from');
    expect(resolved).toBe(expected);
  });
});

describe('resolve special site origin to alias', () => {
  it('/blog', () => {
    const s = `/@olayway/blog`;
    const expected = '/blog';
    const resolved = resolveSiteAlias(s, 'to');
    expect(resolved).toBe(expected);
  });

  it('/core', () => {
    const s = `/@olayway/co2-ppm`;
    const expected = '/core/co2-ppm';
    const resolved = resolveSiteAlias(s, 'to');
    expect(resolved).toBe(expected);
  });
});
