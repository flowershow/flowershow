import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'test',
    NEXT_PUBLIC_ROOT_DOMAIN: 'localhost:3000',
  },
}));

import RemarkCommonMarkLink, { type Options } from './remark-commonmark-link';

function processMarkdown(input: string, opts: Partial<Options> = {}) {
  return unified()
    .use(remarkParse)
    .use(RemarkCommonMarkLink, {
      filePath: opts.filePath ?? 'test.md',
      sitePrefix: opts.sitePrefix ?? '',
      files: opts.files,
      permalinks: opts.permalinks,
    })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(input)
    .then((r) => r.toString());
}

describe('RemarkCommonMarkLink - image sizes', () => {
  it('should add data-fs-width and data-fs-height for widthxheight format', async () => {
    const output = await processMarkdown(
      '![250x100](https://example.com/image.jpg)',
    );
    expect(output).toContain('data-fs-width="250"');
    expect(output).toContain('data-fs-height="100"');
    expect(output).toContain('alt=""');
  });

  it('should add only data-fs-width for width-only format', async () => {
    const output = await processMarkdown(
      '![250](https://example.com/image.jpg)',
    );
    expect(output).toContain('data-fs-width="250"');
    expect(output).not.toContain('data-fs-height');
    expect(output).toContain('alt=""');
  });

  it('should preserve alt text that contains more than just dimensions', async () => {
    const output = await processMarkdown(
      '![My image 250x100](https://example.com/image.jpg)',
    );
    expect(output).toContain('alt="My image 250x100"');
    expect(output).not.toContain('data-fs-width');
    expect(output).not.toContain('data-fs-height');
  });

  it('should preserve alt text with dimensions at the end', async () => {
    const output = await processMarkdown(
      '![Beautiful sunset 500](https://example.com/image.jpg)',
    );
    expect(output).toContain('alt="Beautiful sunset 500"');
    expect(output).not.toContain('data-fs-width');
  });

  it('should not modify images without dimension patterns', async () => {
    const output = await processMarkdown(
      '![A regular image](https://example.com/image.jpg)',
    );
    expect(output).toContain('alt="A regular image"');
    expect(output).not.toContain('data-fs-width');
    expect(output).not.toContain('data-fs-height');
  });

  it('should handle empty alt text', async () => {
    const output = await processMarkdown('![](https://example.com/image.jpg)');
    expect(output).toContain('alt=""');
    expect(output).not.toContain('data-fs-width');
    expect(output).not.toContain('data-fs-height');
  });
});

describe('RemarkCommonMarkLink - data-fs-resolved-file-path', () => {
  it('should set data-fs-resolved-file-path on image when file matches', async () => {
    const output = await processMarkdown('![alt](./photo.png)', {
      filePath: 'blog/post.md',
      files: ['/blog/photo.png', '/other/file.md'],
    });
    expect(output).toContain('data-fs-resolved-file-path="/blog/photo.png"');
  });

  it('should not set data-fs-resolved-file-path when file does not match', async () => {
    const output = await processMarkdown('![alt](./missing.png)', {
      filePath: 'blog/post.md',
      files: ['/blog/photo.png'],
    });
    expect(output).not.toContain('data-fs-resolved-file-path');
  });

  it('should set data-fs-resolved-file-path on link when file matches', async () => {
    const output = await processMarkdown('[click](./other-post.md)', {
      filePath: 'blog/post.md',
      files: ['/blog/other-post.md'],
    });
    expect(output).toContain(
      'data-fs-resolved-file-path="/blog/other-post.md"',
    );
  });

  it('should match extension-less markdown links', async () => {
    const output = await processMarkdown('[click](./other-post)', {
      filePath: 'blog/post.md',
      files: ['/blog/other-post.md'],
    });
    expect(output).toContain(
      'data-fs-resolved-file-path="/blog/other-post.md"',
    );
  });

  it('should resolve parent directory references', async () => {
    const output = await processMarkdown('![alt](../assets/image.png)', {
      filePath: 'blog/post.md',
      files: ['/assets/image.png'],
    });
    expect(output).toContain('data-fs-resolved-file-path="/assets/image.png"');
  });

  it('should handle %20-encoded spaces in paths', async () => {
    const output = await processMarkdown('![alt](./my%20photo.png)', {
      filePath: 'blog/post.md',
      files: ['/blog/my photo.png'],
    });
    expect(output).toContain('data-fs-resolved-file-path="/blog/my photo.png"');
  });

  it('should not set data-fs-resolved-file-path when files list is empty', async () => {
    const output = await processMarkdown('![alt](./photo.png)', {
      filePath: 'blog/post.md',
    });
    expect(output).not.toContain('data-fs-resolved-file-path');
  });
});
