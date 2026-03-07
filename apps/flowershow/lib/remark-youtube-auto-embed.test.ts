import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import remarkYouTubeAutoEmbed from './remark-youtube-auto-embed';

function processMarkdown(input: string) {
  return unified()
    .use(remarkParse)
    .use(remarkYouTubeAutoEmbed)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(input)
    .then((r) => r.toString());
}

// Bare link in standard CommonMark is written as [url](url).
// In production the pipeline also uses remark-gfm which auto-links plain URLs,
// but standard link syntax is sufficient to test the plugin's link-node path.
describe('remarkYouTubeAutoEmbed - bare link (existing behaviour)', () => {
  it('should embed a youtube.com/watch link', async () => {
    const output = await processMarkdown(
      '[https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)',
    );
    expect(output).toContain('iframe');
    expect(output).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  });

  it('should embed a youtu.be link', async () => {
    const output = await processMarkdown(
      '[https://youtu.be/dQw4w9WgXcQ](https://youtu.be/dQw4w9WgXcQ)',
    );
    expect(output).toContain('iframe');
    expect(output).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  });

  it('should carry over a start-time parameter', async () => {
    const output = await processMarkdown(
      '[watch](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s)',
    );
    expect(output).toContain('start=42');
  });

  it('should not embed a non-YouTube link', async () => {
    const output = await processMarkdown('[example](https://example.com)');
    expect(output).not.toContain('iframe');
    expect(output).toContain('example.com');
  });

  it('should not embed when the link is not alone in a paragraph', async () => {
    const output = await processMarkdown(
      'See [video](https://www.youtube.com/watch?v=dQw4w9WgXcQ) for details',
    );
    expect(output).not.toContain('iframe');
  });
});

describe('remarkYouTubeAutoEmbed - Obsidian image-embed syntax', () => {
  it('should embed ![](youtube.com/watch?v=...) as an iframe', async () => {
    const output = await processMarkdown(
      '![](https://www.youtube.com/watch?v=dQw4w9WgXcQ)',
    );
    expect(output).toContain('iframe');
    expect(output).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  });

  it('should embed ![](youtu.be/...) as an iframe', async () => {
    const output = await processMarkdown('![](https://youtu.be/dQw4w9WgXcQ)');
    expect(output).toContain('iframe');
    expect(output).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  });

  it('should carry over a start-time parameter from image embed', async () => {
    const output = await processMarkdown(
      '![](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90)',
    );
    expect(output).toContain('start=90');
  });

  it('should carry over a start-time parameter with s suffix', async () => {
    const output = await processMarkdown(
      '![](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s)',
    );
    expect(output).toContain('start=42');
  });

  it('should not embed a non-YouTube image', async () => {
    const output = await processMarkdown(
      '![A cat](https://example.com/cat.jpg)',
    );
    expect(output).not.toContain('iframe');
    expect(output).toContain('<img');
  });

  it('should embed with alt text present', async () => {
    const output = await processMarkdown(
      '![My cool video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)',
    );
    expect(output).toContain('iframe');
    expect(output).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  });

  it('should not embed an image that is not alone in a paragraph', async () => {
    const output = await processMarkdown(
      'Watch this ![](https://www.youtube.com/watch?v=dQw4w9WgXcQ) video',
    );
    expect(output).not.toContain('iframe');
  });

  it('should apply responsive wrapper styles', async () => {
    const output = await processMarkdown(
      '![](https://www.youtube.com/watch?v=dQw4w9WgXcQ)',
    );
    expect(output).toContain('position:relative');
    expect(output).toContain('padding-bottom:56.25%');
  });
});
