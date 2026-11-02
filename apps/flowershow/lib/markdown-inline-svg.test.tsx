/**
 * Inline SVG in pages (#1427). A blank line ends a CommonMark HTML block, so a
 * blank line inside an `<svg>` (e.g. in its `<style>`) used to turn the rest
 * of the SVG into markdown: the `<p>` broke the HTML parser out of SVG, and the
 * remaining elements (`<animateMotion>`, `<path/>`, …) were parsed as
 * lowercased, never-closed HTML elements that swallowed the rest of the page.
 */
import { serialize } from 'next-mdx-remote-client/serialize';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  getMdxOptions,
  processMarkdown,
  protectSvgBlankLines,
} from './markdown';

const base = {
  filePath: 'roadmap.md',
  files: [],
  siteHostname: 'test.flowershow.site',
};

// Shape of the wayofmarkdown.com roadmap: an SVG in a `<div>`, with a blank
// line in its `<style>` and SMIL animation after it.
const PAGE = `# Roadmap

<div class="wide">
<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><style>
.rail { stroke: #ff5a00; }

.ball { fill: #ff5a00; }
</style><path id="track" d="M10 50 H190"/><circle class="ball" r="3"><animateMotion dur="3s" repeatCount="indefinite" path="M10 50 H190" keyPoints="0;1" keyTimes="0;1"/><animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="0;1;0"/></circle></svg>
</div>

## After the SVG

This paragraph must render.
`;

async function renderMd(source: string) {
  return renderToStaticMarkup(await processMarkdown(source, base));
}

describe('inline SVG — MD renderer (processMarkdown)', () => {
  it('keeps SMIL elements camelCase when the SVG contains a blank line', async () => {
    const html = await renderMd(PAGE);

    expect(html).toContain('<animateMotion');
    expect(html).not.toContain('<animatemotion');
    expect(html).toContain('repeatCount="indefinite"');
  });

  it('keeps the SVG whole and renders the content after it', async () => {
    const html = await renderMd(PAGE);

    // The <style> stays inside the SVG rather than leaking into a paragraph
    expect(html).not.toMatch(/<p>\s*\.ball/);
    expect(html).toMatch(/<\/circle><\/svg>\s*<\/div>/);
    expect(html).toMatch(/<h2[^>]*>.*After the SVG<\/h2>/);
    expect(html).toContain('<p>This paragraph must render.</p>');
  });

  it('still renders markdown between HTML blocks outside an SVG', async () => {
    const html = await renderMd('<div>\n\n**bold**\n\n</div>');

    expect(html).toContain('<strong>bold</strong>');
  });
});

describe('protectSvgBlankLines', () => {
  it('drops blank lines inside an <svg> element only', () => {
    expect(
      protectSvgBlankLines('a\n\n<svg>\n<g/>\n  \n<g/>\n</svg>\n\nb'),
    ).toBe('a\n\n<svg>\n<g/>\n<g/>\n</svg>\n\nb');
  });

  it('leaves SVG in fenced code blocks alone', () => {
    const fenced = '```html\n<svg>\n\n</svg>\n```';

    expect(protectSvgBlankLines(fenced)).toBe(fenced);
  });

  it('stays linear on many unclosed <svg> tags', () => {
    const source = '<svg x\n'.repeat(100_000);

    const start = performance.now();
    expect(protectSvgBlankLines(source)).toBe(source);
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe('inline SVG — MDX renderer (getMdxOptions)', () => {
  it('keeps SMIL elements camelCase', async () => {
    const result = await serialize({
      source:
        '<svg viewBox="0 0 10 10"><circle r="1"><animateMotion dur="3s" path="M0 0 H10"/><animate attributeName="opacity" dur="3s" values="0;1"/></circle></svg>\n\nAfter the SVG.',
      options: getMdxOptions(base) as never,
    });
    if ('error' in result) throw result.error;

    expect(result.compiledSource).toContain('"animateMotion"');
    expect(result.compiledSource).toContain('After the SVG.');
  });
});
