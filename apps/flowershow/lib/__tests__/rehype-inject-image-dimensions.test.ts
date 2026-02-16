import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeInjectImageDimensions from '../rehype-inject-image-dimensions';
import type { ImageDimensionsMap } from '../image-dimensions';

async function process(markdown: string, dimensions: ImageDimensionsMap) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeInjectImageDimensions, { dimensions })
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}

describe('rehypeInjectImageDimensions', () => {
  it('injects width and height from dimensions map onto img elements', async () => {
    const dimensions: ImageDimensionsMap = {
      '/photo.png': { width: 800, height: 600 },
    };

    const html = await process('![alt](/photo.png)', dimensions);

    expect(html).toContain('width="800"');
    expect(html).toContain('height="600"');
  });

  it('does not overwrite existing (author-explicit) dimensions', async () => {
    const dimensions: ImageDimensionsMap = {
      '/photo.png': { width: 800, height: 600 },
    };

    // Use raw HTML with rehypeRaw to get an img that already has width/height
    const result = await unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeInjectImageDimensions, { dimensions })
      .use(rehypeStringify)
      .process('<img src="/photo.png" width="250" height="100" alt="alt">');

    const html = String(result);
    expect(html).toContain('width="250"');
    expect(html).toContain('height="100"');
  });

  it('leaves images alone when no dimensions found in map', async () => {
    const dimensions: ImageDimensionsMap = {};

    const html = await process('![alt](/unknown.png)', dimensions);

    expect(html).not.toContain('width=');
    expect(html).not.toContain('height=');
  });
});
