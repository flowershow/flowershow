import { CONTENT_TYPE_EXTENSIONS } from '@flowershow/core';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { rewriteRawIfNeeded, rewriteSocialCardIfNeeded } from './middleware';

const API_BASE = '/api/raw/victim/notes';

function makeReq(rawUrl: string): NextRequest {
  return new NextRequest(`http://localhost${rawUrl}`);
}

/**
 * The value NextResponse.rewrite() stores in the x-middleware-rewrite header,
 * parsed back into a URL so we can inspect pathname and search independently.
 */
function rewriteTarget(res: ReturnType<typeof rewriteRawIfNeeded>): URL {
  const header = res?.headers.get('x-middleware-rewrite');
  if (!header) throw new Error('expected a rewrite response');
  return new URL(header);
}

describe('rewriteRawIfNeeded — query strings on raw files (#1345)', () => {
  it('serves a raw .html file that carries a query string, with the query kept out of the blob path', () => {
    const inputPath = '/index.html?cb=123';
    const res = rewriteRawIfNeeded(
      inputPath,
      API_BASE,
      makeReq(inputPath),
      null,
    );

    const target = rewriteTarget(res);
    // Blob key is built from the pathname segments — the query must not be folded in.
    expect(target.pathname).toBe('/api/raw/victim/notes/index.html');
    // The query is preserved in the URL so browser caching / tracking params survive.
    expect(target.search).toBe('?cb=123');
  });

  it('handles multiple query params without folding them into the blob path', () => {
    const inputPath = '/index.html?utm_source=x&utm_medium=y';
    const res = rewriteRawIfNeeded(
      inputPath,
      API_BASE,
      makeReq(inputPath),
      null,
    );

    const target = rewriteTarget(res);
    expect(target.pathname).toBe('/api/raw/victim/notes/index.html');
    expect(target.search).toBe('?utm_source=x&utm_medium=y');
  });

  it('handles a valueless query param (?a)', () => {
    const inputPath = '/index.html?a';
    const res = rewriteRawIfNeeded(
      inputPath,
      API_BASE,
      makeReq(inputPath),
      null,
    );

    const target = rewriteTarget(res);
    expect(target.pathname).toBe('/api/raw/victim/notes/index.html');
    expect(target.search).toBe('?a');
  });

  it('works for non-HTML file types too (.pdf) with a query string', () => {
    const inputPath = '/report.pdf?utm_source=x';
    const res = rewriteRawIfNeeded(
      inputPath,
      API_BASE,
      makeReq(inputPath),
      null,
    );

    const target = rewriteTarget(res);
    expect(target.pathname).toBe('/api/raw/victim/notes/report.pdf');
    expect(target.search).toBe('?utm_source=x');
  });

  it('strips the query before building the blob path for a nested file', () => {
    const inputPath = '/docs/guide.html?ref=nav';
    const res = rewriteRawIfNeeded(
      inputPath,
      API_BASE,
      makeReq(inputPath),
      null,
    );

    const target = rewriteTarget(res);
    expect(target.pathname).toBe('/api/raw/victim/notes/docs/guide.html');
    expect(target.search).toBe('?ref=nav');
  });

  it('still serves a raw file with no query string (unchanged behavior)', () => {
    const inputPath = '/index.html';
    const res = rewriteRawIfNeeded(
      inputPath,
      API_BASE,
      makeReq(inputPath),
      null,
    );

    const target = rewriteTarget(res);
    expect(target.pathname).toBe('/api/raw/victim/notes/index.html');
    expect(target.search).toBe('');
  });

  it('does not treat an extensionless page path as a raw file, even with a query', () => {
    // Markdown / regular pages have no whitelisted extension and must fall
    // through (return null) so the page renderer handles them.
    const inputPath = '/docs/kitchen-sink?utm_source=x';
    const res = rewriteRawIfNeeded(
      inputPath,
      API_BASE,
      makeReq(inputPath),
      null,
    );

    expect(res).toBeNull();
  });
});

describe('rewriteRawIfNeeded — asset types (flowershow-tui)', () => {
  const raw = (p: string) => rewriteRawIfNeeded(p, API_BASE, makeReq(p), null);

  it.each([
    'mod.mjs',
    'lib.cjs',
    'app.wasm',
    'site.webmanifest',
    'font.otf',
    'font.woff2',
    'old.htm',
    'clip.mov',
    'song.m4a',
    'data.tsv',
    'IMAGE.PNG',
  ])('serves %s as a raw file', (file) => {
    expect(rewriteTarget(raw(`/assets/${file}`)).pathname).toBe(
      `/api/raw/victim/notes/assets/${file}`,
    );
  });

  it('serves every extension that has a known content type, except ones that look like page names', () => {
    for (const ext of CONTENT_TYPE_EXTENSIONS) {
      if (ext === 'base' || ext === 'map') continue;
      expect(raw(`/f.${ext}`), ext).not.toBeNull();
    }
  });

  // A note "Knowledge.base.md" gets the slug /Knowledge.base; treating that as
  // a raw file would 404 the page (flowershow-tui review).
  it.each(['/Knowledge.base', '/notes/Road.map'])(
    'leaves page slug %s to the page renderer',
    (p) => {
      expect(raw(p)).toBeNull();
    },
  );

  it('serves archives, documents, ebooks and data downloads', () => {
    for (const ext of ['zip', 'tar', 'gz', 'eot', 'epub', 'docx', 'parquet']) {
      expect(raw(`/f.${ext}`), ext).not.toBeNull();
    }
  });
});

// flowershow-isx: pages link /custom.css?v=<hash>; the raw route needs the
// version to decide whether the response may be cached as immutable.
describe('rewriteRawIfNeeded — custom.css stylesheet link', () => {
  it.each([
    ['subdomain', API_BASE],
    ['custom domain', '/api/raw/_domain/docs.example.com'],
  ])(
    'rewrites /custom.css?v= to the raw route with the version kept (%s)',
    (_label, base) => {
      const p = '/custom.css?v=0123456789abcdef';
      const target = rewriteTarget(
        rewriteRawIfNeeded(p, base, makeReq(p), null),
      );
      expect(target.pathname).toBe(`${base}/custom.css`);
      expect(target.search).toBe('?v=0123456789abcdef');
    },
  );
});

describe('rewriteSocialCardIfNeeded (flowershow-1o5)', () => {
  const base = '/api/og/ana/notes';
  const go = (p: string) =>
    rewriteSocialCardIfNeeded(p, base, makeReq(p), null);

  it('rewrites the home card', () => {
    const t = rewriteTarget(go('/_og?v=abc'));
    expect(t.pathname).toBe('/api/og/ana/notes');
    expect(t.searchParams.get('v')).toBe('abc');
  });
  it('rewrites a nested page card', () => {
    expect(rewriteTarget(go('/_og/blog/post?v=abc')).pathname).toBe(
      '/api/og/ana/notes/blog/post',
    );
  });
  it('ignores other paths, including look-alikes', () => {
    expect(go('/blog/_og')).toBeNull();
    expect(go('/_ogre')).toBeNull();
    expect(go('/about')).toBeNull();
  });
});
