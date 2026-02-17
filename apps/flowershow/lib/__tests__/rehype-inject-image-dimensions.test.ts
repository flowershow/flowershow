import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeInjectImageDimensions from '../rehype-inject-image-dimensions';
import type { ImageDimensionsMap } from '../image-dimensions';

async function processWithRawHtml(
  html: string,
  dimensions: ImageDimensionsMap,
) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeInjectImageDimensions, { dimensions })
    .use(rehypeStringify)
    .process(html);

  return String(result);
}

describe('rehypeInjectImageDimensions', () => {
  it('injects intrinsic dimensions as data attributes onto img elements', async () => {
    const dimensions: ImageDimensionsMap = {
      '/photo.png': { width: 800, height: 600 },
    };

    const html = await processWithRawHtml(
      '<img src="/photo.png" data-fs-resolved-file-path="/photo.png" alt="alt">',
      dimensions,
    );

    expect(html).toContain('data-fs-intrinsic-width="800"');
    expect(html).toContain('data-fs-intrinsic-height="600"');
  });

  it('does not overwrite existing (author-explicit) dimensions', async () => {
    const dimensions: ImageDimensionsMap = {
      '/photo.png': { width: 800, height: 600 },
    };

    const html = await processWithRawHtml(
      '<img src="/photo.png" data-fs-resolved-file-path="/photo.png" width="250" height="100" alt="alt">',
      dimensions,
    );

    expect(html).toContain('width="250"');
    expect(html).toContain('height="100"');
  });

  it('leaves images alone when no dimensions found in map', async () => {
    const dimensions: ImageDimensionsMap = {};

    const html = await processWithRawHtml(
      '<img src="/unknown.png" data-fs-resolved-file-path="/unknown.png" alt="alt">',
      dimensions,
    );

    expect(html).not.toContain('data-fs-intrinsic-width');
    expect(html).not.toContain('data-fs-intrinsic-height');
  });

  it('leaves images alone when data-fs-resolved-file-path is missing', async () => {
    const dimensions: ImageDimensionsMap = {
      '/photo.png': { width: 800, height: 600 },
    };

    const html = await processWithRawHtml(
      '<img src="/photo.png" alt="alt">',
      dimensions,
    );

    expect(html).not.toContain('data-fs-intrinsic-width');
    expect(html).not.toContain('data-fs-intrinsic-height');
  });
});
