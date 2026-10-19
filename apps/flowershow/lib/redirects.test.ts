import { describe, expect, it } from 'vitest';
import { matchRedirect } from './redirects';

const to = (path: string, redirects: Parameters<typeof matchRedirect>[1]) =>
  matchRedirect(path, redirects)?.to ?? null;

describe('matchRedirect', () => {
  it('matches exact paths only when `from` has no wildcard', () => {
    const rules = [{ from: '/old', to: '/new' }];
    expect(to('/old', rules)).toBe('/new');
    expect(to('/old/page', rules)).toBeNull();
    expect(to('/older', rules)).toBeNull();
  });

  it('matches a `from` without a leading slash', () => {
    expect(to('/old', [{ from: 'old', to: '/new' }])).toBe('/new');
  });

  it('carries the rest of the path into :splat, including nested folders', () => {
    const rules = [
      { from: '/markdown/*', to: 'https://wayofmarkdown.com/:splat' },
    ];
    expect(to('/markdown/kb/turndown', rules)).toBe(
      'https://wayofmarkdown.com/kb/turndown',
    );
    expect(to('/markdown/learn/howtos/a', rules)).toBe(
      'https://wayofmarkdown.com/learn/howtos/a',
    );
  });

  it('matches the bare folder without leaving a trailing slash', () => {
    expect(
      to('/markdown', [
        { from: '/markdown/*', to: 'https://wayofmarkdown.com/:splat' },
      ]),
    ).toBe('https://wayofmarkdown.com');
    expect(to('/old', [{ from: '/old/*', to: '/new/:splat' }])).toBe('/new');
    expect(to('/old', [{ from: '/old/*', to: '/:splat' }])).toBe('/');
  });

  it('does not match a sibling that shares the prefix', () => {
    expect(to('/markdownx', [{ from: '/markdown/*', to: '/x/:splat' }])).toBe(
      null,
    );
  });

  it('redirects a whole folder to one page when `to` has no :splat', () => {
    expect(to('/old/a/b', [{ from: '/old/*', to: '/archive' }])).toBe(
      '/archive',
    );
  });

  it('uses the first matching rule, so specific rules go above wildcards', () => {
    const rules = [
      { from: '/markdown/kb/apple-notes', to: '/apple' },
      { from: '/markdown/*', to: '/md/:splat' },
      { from: '/markdown/kb/google-docs', to: '/never' },
    ];
    expect(to('/markdown/kb/apple-notes', rules)).toBe('/apple');
    expect(to('/markdown/kb/google-docs', rules)).toBe('/md/kb/google-docs');
  });

  it('supports a site-wide `/*` rule', () => {
    const rules = [{ from: '/*', to: 'https://new.example.com/:splat' }];
    expect(to('/', rules)).toBe('https://new.example.com');
    expect(to('/a/b', rules)).toBe('https://new.example.com/a/b');
  });

  it('never turns a relative target into a protocol-relative URL', () => {
    const rules = [{ from: '/old/*', to: '/:splat' }];
    expect(to('/old//evil.com', rules)).toBe('/evil.com');
    expect(to('/old/\\evil.com', rules)).toBe('/evil.com');
  });

  it('returns null when nothing matches', () => {
    expect(matchRedirect('/a', [])).toBeNull();
  });
});
