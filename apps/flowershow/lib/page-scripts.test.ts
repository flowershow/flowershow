import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PAGE_SCRIPTS, resolvePageScripts } from './page-scripts';

const siteFilePaths = [
  '/js/a.js',
  '/js/b.js',
  '/js/my file.js',
  '/js/café.js',
  '/blog/a.js',
  '/blog/widgets/toggle.js',
  '/x/a.js',
  '/a.js',
  '/A.JS',
  '/style.css',
  '/page.md',
  '/x.mjs',
];

const resolve = (raw: unknown, pagePath = 'blog/post.md') =>
  resolvePageScripts(raw, { pagePath, siteFilePaths });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolvePageScripts', () => {
  it('returns [] for missing or non-string/array values', () => {
    expect(resolve(undefined)).toEqual([]);
    expect(resolve(null)).toEqual([]);
    expect(resolve(42)).toEqual([]);
    expect(resolve({ src: '/js/a.js' })).toEqual([]);
    expect(resolve(true)).toEqual([]);
  });

  it('treats a single string as a one-item list', () => {
    expect(resolve('/js/a.js')).toEqual(['/js/a.js']);
  });

  it('resolves site-root and page-relative paths', () => {
    expect(resolve(['/js/a.js'])).toEqual(['/js/a.js']);
    expect(resolve(['./a.js'])).toEqual(['/blog/a.js']);
    expect(resolve(['a.js'])).toEqual(['/blog/a.js']);
    expect(resolve(['./widgets/toggle.js'])).toEqual([
      '/blog/widgets/toggle.js',
    ]);
    expect(resolve(['../x/a.js'])).toEqual(['/x/a.js']);
  });

  it('resolves relative paths from a root-level page', () => {
    expect(resolve(['a.js'], 'index.md')).toEqual(['/a.js']);
    expect(resolve(['./js/a.js'], 'index.md')).toEqual(['/js/a.js']);
  });

  it('cannot climb above the site root', () => {
    expect(resolve(['../../../a.js'], 'index.md')).toEqual(['/a.js']);
    expect(resolve(['../../../a.js'])).toEqual(['/a.js']);
    expect(resolve(['/a/../../x/a.js'])).toEqual(['/x/a.js']);
    expect(resolve(['/js/../a.js'])).toEqual(['/a.js']);
  });

  it('encodes spaces and unicode per segment', () => {
    expect(resolve(['/js/my file.js'])).toEqual(['/js/my%20file.js']);
    expect(resolve(['/js/my%20file.js'])).toEqual(['/js/my%20file.js']);
    expect(resolve(['/js/café.js'])).toEqual(['/js/caf%C3%A9.js']);
  });

  it('accepts the .js extension case-insensitively', () => {
    expect(resolve(['/A.JS'])).toEqual(['/A.JS']);
  });

  it('ignores a query string or hash on site paths', () => {
    expect(resolve(['/js/a.js?v=2'])).toEqual(['/js/a.js']);
    expect(resolve(['/js/a.js#x'])).toEqual(['/js/a.js']);
  });

  it('keeps https URLs (normalised)', () => {
    expect(resolve(['https://cdn.example.com/x.js'])).toEqual([
      'https://cdn.example.com/x.js',
    ]);
    expect(resolve(['HTTPS://cdn.example.com/x.js'])).toEqual([
      'https://cdn.example.com/x.js',
    ]);
    // External URLs need not end in .js (CDNs often serve packages by name).
    expect(resolve(['https://cdn.jsdelivr.net/npm/foo@1'])).toEqual([
      'https://cdn.jsdelivr.net/npm/foo@1',
    ]);
  });

  it('trims surrounding whitespace', () => {
    expect(resolve([' https://cdn.example.com/x.js '])).toEqual([
      'https://cdn.example.com/x.js',
    ]);
    expect(resolve(['  /js/a.js'])).toEqual(['/js/a.js']);
    expect(resolve(['/js/a.js\n'])).toEqual(['/js/a.js']);
  });

  it.each([
    ['http URL', 'http://cdn.example.com/x.js'],
    ['protocol-relative URL', '//cdn.example.com/x.js'],
    ['javascript: URL', 'javascript:alert(1)'],
    ['javascript: URL with .js', 'javascript:alert(1)//.js'],
    ['data: URL', 'data:text/javascript,alert(1)'],
    ['blob: URL', 'blob:https://example.com/abc'],
    ['URL with credentials', 'https://user:pw@cdn.example.com/x.js'],
    ['leading backslash', '\\\\evil.com\\x.js'],
    ['slash-backslash', '/\\evil.com/x.js'],
    ['encoded backslash', '/%5Cevil.com/x.js'],
    ['encoded backslash (lowercase)', '/%5cevil.com/x.js'],
    ['tab', '/\t/evil.com/x.js'],
    ['encoded tab', '/%09/evil.com/x.js'],
    ['inner newline', '/\n/evil.com/x.js'],
    ['encoded slash', '/%2F/evil.com/x.js'],
    ['malformed percent-encoding', '/js/%E0%A4%A.js'],
    ['CSS file', '/style.css'],
    ['page file', '/page.md'],
    ['module script', '/x.mjs'],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])('rejects %s', (_label, input) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolve([input])).toEqual([]);
  });

  it('skips non-string list items', () => {
    expect(resolve([42, null, '/js/a.js', { a: 1 }])).toEqual(['/js/a.js']);
  });

  it('drops site paths that are not published, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolve(['/js/missing.js', '/js/a.js'])).toEqual(['/js/a.js']);
    expect(warn).toHaveBeenCalled();
  });

  it('removes duplicates and keeps order', () => {
    expect(
      resolve(['/js/b.js', '/js/a.js', '/js/b.js', './../js/a.js']),
    ).toEqual(['/js/b.js', '/js/a.js']);
  });

  it(`keeps at most ${MAX_PAGE_SCRIPTS} scripts`, () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const many = Array.from(
      { length: 15 },
      (_, i) => `https://cdn.example.com/${i}.js`,
    );
    const out = resolve(many);
    expect(out).toHaveLength(MAX_PAGE_SCRIPTS);
    expect(out[0]).toBe('https://cdn.example.com/0.js');
    expect(out[9]).toBe('https://cdn.example.com/9.js');
  });

  it('only ever outputs same-origin root-relative paths or https URLs', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inputs = [
      '/js/a.js',
      './a.js',
      '/\\evil.com/x.js',
      '/%5Cevil.com/x.js',
      '//evil.com/x.js',
      '/\t/evil.com/x.js',
      'https://cdn.example.com/x.js',
      'javascript:alert(1)',
    ];
    for (const out of resolve(inputs)) {
      const url = new URL(out, 'https://site.invalid');
      if (out.startsWith('/')) {
        expect(url.origin).toBe('https://site.invalid');
        expect(out.startsWith('//')).toBe(false);
      } else {
        expect(url.protocol).toBe('https:');
      }
    }
  });
});
