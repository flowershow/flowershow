import { describe, expect, it } from 'vitest';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import rehypeJsonCanvas from './rehype-json-canvas';

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
    .use(rehypeJsonCanvas, {
      canvasFiles,
      siteHostname: 'test.flowershow.site',
    })
    .use(rehypeStringify)
    .process(md);

  return String(result);
}

describe('rehypeJsonCanvas', () => {
  it('replaces canvas image embed with HTML canvas rendering', async () => {
    const html = await processMarkdown('![](diagram.canvas)', {
      'diagram.canvas': SIMPLE_CANVAS_JSON,
    });

    expect(html).toContain('<div class="canvas-embed">');
    expect(html).toContain('canvas-container');
    expect(html).toContain('canvas-node');
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

  it('embeds file content in canvas file nodes when _html is set', async () => {
    const canvasJson = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'notes/hello.md',
          _html: '<p>Hello from embedded note</p>',
        },
      ],
      edges: [],
    });
    const html = await processMarkdown('![](diagram.canvas)', {
      'diagram.canvas': canvasJson,
    });

    expect(html).toContain('canvas-node-file-content');
    expect(html).toContain('Hello from embedded note');
  });

  it('shows filename fallback when fileContents is empty', async () => {
    const canvasJson = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'notes/missing.md',
        },
      ],
      edges: [],
    });
    const html = await processMarkdown('![](diagram.canvas)', {
      'diagram.canvas': canvasJson,
    });

    expect(html).toContain('canvas-node-file');
    expect(html).toContain('notes/missing.md');
    expect(html).not.toContain('canvas-node-file-content');
  });

  it('shows filename fallback for file nodes without _html', async () => {
    const canvasJson = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'page.mdx',
        },
      ],
      edges: [],
    });
    const html = await processMarkdown('![](diagram.canvas)', {
      'diagram.canvas': canvasJson,
    });

    expect(html).not.toContain('canvas-node-file-content');
    expect(html).toContain('page.mdx');
  });

  it('handles invalid canvas JSON gracefully', async () => {
    const html = await processMarkdown('![](bad.canvas)', {
      'bad.canvas': 'not valid json {{{',
    });

    expect(html).toContain('canvas-error');
    expect(html).toContain('Error rendering canvas');
  });
});
