import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeHtmlEnhancements from '../rehype-html-enhancements';

async function processWithRawHtml(html: string) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHtmlEnhancements, {})
    .use(rehypeStringify)
    .process(html);

  return String(result);
}

describe('rehypeHtmlEnhancements', () => {
  it('adds target and rel for external links without explicit target', async () => {
    const html = await processWithRawHtml(
      '<a href="https://example.com">External</a>',
    );

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('respects author-defined target for external links', async () => {
    const html = await processWithRawHtml(
      '<a href="https://example.com" target="_self">External</a>',
    );

    expect(html).toContain('target="_self"');
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('rel="noopener noreferrer"');
  });
});
