import { describe, expect, it } from 'vitest';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import rehypeJsonCanvas from '../rehype-json-canvas';

const SIMPLE_CANVAS_JSON = JSON.stringify({
  nodes: [
    {
      id: 'n1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      text: 'Test Node',
    },
  ],
  edges: [],
});

async function processMarkdown(
  md: string,
  canvasFiles: Record<string, string> = {},
) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeJsonCanvas, { canvasFiles })
    .use(rehypeStringify)
    .process(md);

  return String(result);
}

describe('rehypeJsonCanvas', () => {
  it('replaces canvas image embed with SVG', async () => {
    const html = await processMarkdown('![](diagram.canvas)', {
      'diagram.canvas': SIMPLE_CANVAS_JSON,
    });

    expect(html).toContain('<div class="canvas-embed">');
    expect(html).toContain('<svg');
    expect(html).toContain('Test Node');
    expect(html).not.toContain('<img');
  });

  it('shows error for missing canvas files', async () => {
    const html = await processMarkdown('![](missing.canvas)', {});

    expect(html).toContain('canvas-missing');
    expect(html).toContain('Canvas file not found: missing.canvas');
  });

  it('does not affect non-canvas images', async () => {
    const html = await processMarkdown('![alt](photo.png)', {});

    expect(html).toContain('<img');
    expect(html).toContain('photo.png');
    expect(html).not.toContain('canvas-embed');
  });

  it('handles multiple canvas embeds', async () => {
    const md = '![](a.canvas)\n\n![](b.canvas)';
    const html = await processMarkdown(md, {
      'a.canvas': SIMPLE_CANVAS_JSON,
      'b.canvas': SIMPLE_CANVAS_JSON,
    });

    const matches = html.match(/class="canvas-embed"/g);
    expect(matches?.length).toBe(2);
  });

  it('handles invalid canvas JSON gracefully', async () => {
    const html = await processMarkdown('![](bad.canvas)', {
      'bad.canvas': 'not valid json {{{',
    });

    expect(html).toContain('canvas-error');
    expect(html).toContain('Error rendering canvas');
  });
});
