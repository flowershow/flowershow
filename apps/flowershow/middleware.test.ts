import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { rewriteRawIfNeeded } from './middleware';

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
