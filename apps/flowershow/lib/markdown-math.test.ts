/**
 * Behavioral tests for how the markdown pipeline treats `$` in prose vs. math.
 *
 * Seam: the exported `processMarkdown` (the RSC rendering path). We render its
 * React output to static HTML and assert on user-visible behavior — never on
 * remark-math internals.
 *
 * Context (#1359): single-dollar text math is disabled, so currency amounts in
 * prose are never mistaken for math. Inline math is written with single-line
 * `$$...$$`; block math with the multi-line fenced form.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { processMarkdown } from './markdown';

async function renderHtml(md: string): Promise<string> {
  const element = await processMarkdown(md, {
    filePath: '/index.md',
    files: [],
    siteHostname: 'test.flowershow.site',
  });
  return renderToStaticMarkup(element);
}

describe('currency amounts in prose', () => {
  it('does not parse the text between two dollar amounts as math', async () => {
    const html = await renderHtml(
      'Solar cost about $61 per MWh, *cheaper* than gas at $76/MWh.',
    );

    // No math is produced from the currency mentions.
    expect(html).not.toContain('katex');
    // The emphasis reaches the markdown parser and renders as <em>, which only
    // happens if the `*cheaper*` span was NOT swallowed into a math node.
    expect(html).toContain('<em>cheaper</em>');
    // The literal dollar amounts survive as text.
    expect(html).toContain('$61');
    expect(html).toContain('$76');
  });
});

describe('inline math with double dollars', () => {
  it('renders single-line $$...$$ as inline (not block) KaTeX', async () => {
    const html = await renderHtml('Energy is $$E = mc^2$$ here.');

    expect(html).toContain('katex');
    // Inline: no display wrapper.
    expect(html).not.toContain('katex-display');
    expect(html).toContain('here.');
  });
});

describe('block math with double dollars', () => {
  it('renders multi-line $$ fences as display KaTeX', async () => {
    const html = await renderHtml('$$\nE = mc^2\n$$');

    expect(html).toContain('katex-display');
  });
});
