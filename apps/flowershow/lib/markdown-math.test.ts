/**
 * Behavioral tests for how the markdown pipeline treats `$` in prose vs. math.
 *
 * Two seams:
 *  - `protectNonMathDollars` (unit): the string pre-processor that decides which
 *    `$` are real math delimiters and which are literal dollar signs.
 *  - `processMarkdown` (integration): the RSC rendering path. We render its React
 *    output to static HTML and assert on user-visible behavior.
 *
 * Context (#1359): single-dollar inline math stays enabled, but any `$` that
 * isn't part of a genuine `$…$` span (no space just inside either delimiter) is
 * escaped upstream so dollar signs in prose are never mistaken for math.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { processMarkdown, protectNonMathDollars } from './markdown';

async function renderHtml(md: string): Promise<string> {
  const element = await processMarkdown(md, {
    filePath: '/index.md',
    files: [],
    siteHostname: 'test.flowershow.site',
  });
  return renderToStaticMarkup(element);
}

describe('protectNonMathDollars', () => {
  it('keeps genuine single-dollar math spans untouched', () => {
    expect(protectNonMathDollars('area is $x_2 = 4$ here')).toBe(
      'area is $x_2 = 4$ here',
    );
    // Digit-leading / operator math is a real span too.
    expect(protectNonMathDollars('so $2*4=8$ holds')).toBe('so $2*4=8$ holds');
  });

  it('keeps double-dollar (inline and block) math untouched', () => {
    expect(protectNonMathDollars('e is $$E = mc^2$$ ok')).toBe(
      'e is $$E = mc^2$$ ok',
    );
    expect(protectNonMathDollars('$$\nE = mc^2\n$$')).toBe('$$\nE = mc^2\n$$');
  });

  it('escapes currency amounts (a $ glued to a number, unpaired)', () => {
    expect(protectNonMathDollars('From $50 to $60')).toBe(
      'From \\$50 to \\$60',
    );
  });

  it('escapes a $ with a space just inside a would-be span', () => {
    // Space right after the opening `$` → not math.
    expect(protectNonMathDollars('give $ 5 please')).toBe('give \\$ 5 please');
    // Space right before the closing `$` → not math.
    expect(protectNonMathDollars('$x = 5 $ nope')).toBe('\\$x = 5 \\$ nope');
  });

  it('separates literal prices from a real span in the same sentence', () => {
    expect(protectNonMathDollars('It costs $5 but area is $a^2$ units')).toBe(
      'It costs \\$5 but area is $a^2$ units',
    );
  });

  it('leaves already-escaped dollars alone (no double escaping)', () => {
    expect(protectNonMathDollars('literal \\$5 stays')).toBe(
      'literal \\$5 stays',
    );
  });

  it('never touches `$` inside code spans or fences', () => {
    expect(protectNonMathDollars('run `echo $1` now')).toBe(
      'run `echo $1` now',
    );
    expect(protectNonMathDollars('```sh\nprice=$50\n```')).toBe(
      '```sh\nprice=$50\n```',
    );
  });
});

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

describe('single-dollar inline math', () => {
  it('renders `$...$` as inline (not block) KaTeX', async () => {
    const html = await renderHtml('Kinetic energy is $\\frac{1}{2}mv^2$ here.');

    expect(html).toContain('katex');
    // Inline: no display wrapper.
    expect(html).not.toContain('katex-display');
    expect(html).toContain('here.');
  });

  it('renders digit-leading math like `$2*4=8$` as KaTeX', async () => {
    const html = await renderHtml('The claim $2*4=8$ is true.');

    expect(html).toContain('katex');
  });

  it('renders `$...$` even when currency also appears in the same prose', async () => {
    const html = await renderHtml('It costs $5 but the area is $a^2$ units.');

    // Currency stays literal, genuine math renders.
    expect(html).toContain('katex');
    expect(html).toContain('$5');
  });
});

describe('block math with double dollars', () => {
  it('renders multi-line $$ fences as display KaTeX', async () => {
    const html = await renderHtml('$$\nE = mc^2\n$$');

    expect(html).toContain('katex-display');
  });
});
