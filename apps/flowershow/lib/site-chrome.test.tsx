import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: { NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.local' },
}));

const { query, processHtmlFragment, generateScopedCss } = vi.hoisted(() => ({
  query: { getSiteChromeFile: vi.fn() },
  processHtmlFragment: vi.fn(),
  generateScopedCss: vi.fn(),
}));
vi.mock('@/trpc/server', () => ({
  api: {
    site: {
      getSiteChromeFile: {
        query: (...a: unknown[]) => query.getSiteChromeFile(...a),
      },
    },
  },
}));

// Real HTML pipeline and CSS generation by default; tests can make them throw.
vi.mock('@/lib/markdown', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/markdown')>();
  processHtmlFragment.mockImplementation(actual.processHtmlFragment);
  return { ...actual, processHtmlFragment };
});

vi.mock('@/lib/generate-scoped-css', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/generate-scoped-css')>();
  generateScopedCss.mockImplementation(actual.generateScopedCss);
  return { generateScopedCss };
});

import { loadCustomFooter } from './site-chrome';

const premiumSite = {
  id: 'site-1',
  plan: 'PREMIUM',
  customDomain: null,
  subdomain: 'my-site',
} as any;

async function renderFooter(html: string) {
  query.getSiteChromeFile.mockResolvedValue(html);
  const result = await loadCustomFooter({ site: premiumSite });
  expect(result).not.toBeNull();
  return renderToStaticMarkup(result as ReactElement);
}

describe('loadCustomFooter', () => {
  let actualProcess: (...a: any[]) => any;
  let actualCss: (...a: any[]) => any;

  beforeEach(async () => {
    actualProcess ??= processHtmlFragment.getMockImplementation()!;
    actualCss ??= generateScopedCss.getMockImplementation()!;
    vi.clearAllMocks();
    processHtmlFragment.mockImplementation(actualProcess);
    generateScopedCss.mockImplementation(actualCss);
    query.getSiteChromeFile.mockResolvedValue('<p>Made by Acme</p>');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns null on the Free plan without fetching anything', async () => {
    const result = await loadCustomFooter({
      site: { ...premiumSite, plan: 'FREE' },
    });
    expect(result).toBeNull();
    expect(query.getSiteChromeFile).not.toHaveBeenCalled();
  });

  it('renders the file as HTML, not markdown', async () => {
    const html = await renderFooter(
      '<p>Made by <strong>Acme</strong></p>\n\n**not bold** [not](a-link)',
    );
    expect(html).toContain('<p>Made by <strong>Acme</strong></p>');
    expect(html).toContain('**not bold** [not](a-link)');
    expect(html).not.toContain('<a href="/a-link"');
  });

  it('resolves relative and root-relative link and image URLs from the site root', async () => {
    const html = await renderFooter(
      [
        '<a href="about">About</a>',
        '<a href="docs/guide.md">Guide</a>',
        '<a href="/contact">Contact</a>',
        '<a href="https://example.com">Ext</a>',
        '<img src="assets/logo.png" alt="Logo">',
        '<img src="/assets/badge.svg" alt="Badge">',
      ].join('\n'),
    );
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/docs/guide"');
    expect(html).toContain('href="/contact"');
    expect(html).toMatch(
      /href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer"/,
    );
    expect(html).toContain(
      'src="http://my-site.flowershow.local/assets/logo.png"',
    );
    expect(html).toContain(
      'src="http://my-site.flowershow.local/assets/badge.svg"',
    );
  });

  it('compiles Tailwind classes into a scoped #unocss-footer style', async () => {
    const html = await renderFooter('<p class="text-center font-bold">Hi</p>');
    expect(html).toContain('<p class="text-center font-bold">Hi</p>');
    const style = html.match(/<style id="unocss-footer">([\s\S]*?)<\/style>/);
    expect(style?.[1]).toContain('.site-footer-custom .text-center');
    expect(style?.[1]).toContain('.site-footer-custom .font-bold');
    expect(generateScopedCss).toHaveBeenCalledWith(
      '<p class="text-center font-bold">Hi</p>',
      '.site-footer-custom',
    );
  });

  it('keeps raw HTML the same as in pages (no extra stripping)', async () => {
    const html = await renderFooter(
      '<div style="color: red" data-x="1"><span>ok</span></div>',
    );
    expect(html).toContain('style="color:red"');
    expect(html).toContain('data-x="1"');
  });

  it('reduces a pasted full document to its body and strips head-only elements', async () => {
    const html = await renderFooter(
      [
        '<!doctype html>',
        '<html lang="en"><head>',
        '<meta charset="utf-8">',
        '<title>Evil Title</title>',
        '<meta name="description" content="hijack">',
        '<base href="https://evil.example/">',
        '<link rel="icon" href="/favicon.ico">',
        '<link rel="stylesheet" href="https://cdn.example/footer.css">',
        '<style>.x{color:red}</style>',
        '</head><body class="page"><p>hi</p></body></html>',
      ].join('\n'),
    );
    expect(html).toContain('<p>hi</p>');
    expect(html).not.toMatch(/<title|<meta|<base|rel="icon"/);
    expect(html).not.toContain('Evil Title');
    expect(html).not.toMatch(/<html|<head|<body/);
    expect(html).toContain('href="https://cdn.example/footer.css"');
    expect(html).toContain('<style>.x{color:red}</style>');
  });

  it('strips head-only elements from a plain fragment too', async () => {
    const html = await renderFooter(
      '<title>T</title><meta name="description" content="d"><p>ok</p>',
    );
    expect(html).toContain('<p>ok</p>');
    expect(html).not.toMatch(/<title|<meta/);
  });

  it('passes <script> and <style> through as-is, like pages', async () => {
    const html = await renderFooter(
      '<style>.foot{color:red}</style><p class="foot">x</p><script>window.__f = 1;</script>',
    );
    expect(html).toContain('<style>.foot{color:red}</style>');
    expect(html).toContain('<script>window.__f = 1;</script>');
  });

  it('returns null (default footer) for HTML React cannot render, e.g. an invalid style', async () => {
    query.getSiteChromeFile.mockResolvedValue('<div style="color">x</div>');
    expect(await loadCustomFooter({ site: premiumSite })).toBeNull();
  });

  it('returns null when the file is missing', async () => {
    query.getSiteChromeFile.mockResolvedValue(null);
    expect(await loadCustomFooter({ site: premiumSite })).toBeNull();
  });

  it.each(['', '  \n\t', '<!-- todo: footer -->\n'])(
    'returns null for an empty file (%j) and keeps the default footer',
    async (content) => {
      query.getSiteChromeFile.mockResolvedValue(content);
      expect(await loadCustomFooter({ site: premiumSite })).toBeNull();
      expect(processHtmlFragment).not.toHaveBeenCalled();
    },
  );

  it('returns null when rendering the HTML throws', async () => {
    processHtmlFragment.mockRejectedValue(new Error('boom'));
    expect(await loadCustomFooter({ site: premiumSite })).toBeNull();
  });

  it('returns null when generating the scoped CSS throws', async () => {
    generateScopedCss.mockRejectedValue(new Error('unocss boom'));
    expect(await loadCustomFooter({ site: premiumSite })).toBeNull();
  });

  it('returns null when the footer fetch fails', async () => {
    query.getSiteChromeFile.mockRejectedValue(new Error('s3 down'));
    expect(await loadCustomFooter({ site: premiumSite })).toBeNull();
  });
});
