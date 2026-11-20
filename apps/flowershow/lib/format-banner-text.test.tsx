import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { formatBannerText } from './format-banner-text';

const html = (text: string) =>
  renderToStaticMarkup(<>{formatBannerText(text)}</>);

describe('formatBannerText', () => {
  it('passes plain text through', () => {
    expect(html('Hello world')).toBe('Hello world');
  });

  it('renders nothing for an empty string', () => {
    expect(formatBannerText('')).toEqual([]);
  });

  it('renders **bold**', () => {
    expect(html('a **b** c')).toBe('a <strong>b</strong> c');
  });

  it('renders *italic*', () => {
    expect(html('a *b* c')).toBe('a <em>b</em> c');
  });

  it('renders external links in a new tab', () => {
    expect(html('[Docs](https://example.com/a?b=1)')).toBe(
      '<a href="https://example.com/a?b=1" target="_blank" rel="noopener noreferrer" class="underline hover:no-underline">Docs</a>',
    );
  });

  it('renders relative and mailto links in the same tab', () => {
    expect(html('[Blog](/blog/v2)')).toBe(
      '<a href="/blog/v2" class="underline hover:no-underline">Blog</a>',
    );
    expect(html('[Mail](mailto:hi@example.com)')).toContain(
      'href="mailto:hi@example.com"',
    );
  });

  it('combines the patterns', () => {
    expect(html('**New:** *v2* is [out](/v2)!')).toBe(
      '<strong>New:</strong> <em>v2</em> is <a href="/v2" class="underline hover:no-underline">out</a>!',
    );
  });

  it('nests italic and links inside bold, and italic inside a link', () => {
    expect(html('**a *b* [c](/d)**')).toBe(
      '<strong>a <em>b</em> <a href="/d" class="underline hover:no-underline">c</a></strong>',
    );
    expect(html('[*x*](/y)')).toContain('<em>x</em>');
  });

  it('nests bold inside italic', () => {
    expect(html('*a **b** c*')).toBe('<em>a <strong>b</strong> c</em>');
  });

  it('shows unclosed or empty syntax as written', () => {
    expect(html('**unclosed')).toBe('**unclosed');
    expect(html('*unclosed')).toBe('*unclosed');
    expect(html('[label](/x')).toBe('[label](/x');
    expect(html('[label] (/x)')).toBe('[label] (/x)');
    expect(html('****')).toBe('****');
    expect(html('**')).toBe('**');
    expect(html('a ** b')).toBe('a ** b');
  });

  it('keeps content after a stray marker', () => {
    expect(html('**a *b** c')).toContain('c');
    expect(html('5 * 3 = 15 and 2 * 4 = 8')).toBe('5 * 3 = 15 and 2 * 4 = 8');
    expect(html('a ** b ** c')).toBe('a ** b ** c');
  });

  it('refuses unsafe link schemes and shows them as text', () => {
    expect(html('[x](javascript:alert(1))')).not.toContain('<a');
    expect(html('[x](data:text/html,hi)')).not.toContain('<a');
    expect(html('[x](JavaScript:alert)')).not.toContain('<a');
  });

  it('escapes raw HTML', () => {
    expect(html('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    expect(html('**<b>x</b>**')).toBe('<strong>&lt;b&gt;x&lt;/b&gt;</strong>');
  });

  it('does not nest a link inside a link label', () => {
    expect(html('[a [b](/c)](/d)')).not.toMatch(/<a[^>]*><a/);
  });
});
