/**
 * Behavioral tests for how the markdown pipeline treats `$` in prose.
 *
 * Seam: the exported `processMarkdown` (the RSC rendering path). We render its
 * React output to static HTML and assert on user-visible behavior — never on
 * remark-math internals.
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

    // The emphasis must reach the markdown emphasis parser and render as <em>,
    // which only happens if the `*cheaper*` span is NOT swallowed into math.
    expect(html).toContain('<em>cheaper</em>');
    // No KaTeX math node should be produced from the currency mentions.
    expect(html).not.toContain('katex');
    // The literal dollar amounts survive as text.
    expect(html).toContain('$61');
    expect(html).toContain('$76');
  });
});

describe('genuine inline math', () => {
  it('still renders double-dollar inline math as KaTeX', async () => {
    const html = await renderHtml('The identity $$E = mc^2$$ is famous.');

    expect(html).toContain('katex');
    // The surrounding prose is untouched.
    expect(html).toContain('is famous.');
  });
});
