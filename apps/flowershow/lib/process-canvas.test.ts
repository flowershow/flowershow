import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { processCanvas } from './process-canvas';

const SIMPLE_CANVAS = JSON.stringify({
  nodes: [
    {
      id: 'n1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      text: 'Hello **bold** world',
    },
    {
      id: 'n2',
      type: 'text',
      x: 300,
      y: 0,
      width: 200,
      height: 100,
      text: 'Plain text',
    },
  ],
  edges: [],
});

describe('processCanvas', () => {
  it('renders markdown in text nodes as HTML, not as raw tags', async () => {
    const element = await processCanvas(SIMPLE_CANVAS);
    const html = renderToStaticMarkup(element);

    // Markdown should be rendered: **bold** becomes <strong>bold</strong>
    expect(html).toContain('<strong>bold</strong>');

    // Should NOT show raw HTML tags as text (the bug we're fixing)
    expect(html).not.toContain('&lt;p&gt;');
    expect(html).not.toContain('&lt;strong&gt;');
  });

  it('uses dangerouslySetInnerHTML for processed markdown nodes', async () => {
    const element = await processCanvas(SIMPLE_CANVAS);
    const html = renderToStaticMarkup(element);

    // The processed markdown should appear as rendered HTML inside the node
    expect(html).toContain('Hello');
    expect(html).toContain('bold');
    expect(html).toContain('world');
  });

  it('renders canvas structure with positioned divs', async () => {
    const element = await processCanvas(SIMPLE_CANVAS);
    const html = renderToStaticMarkup(element);

    expect(html).toContain('canvas-page');
    expect(html).toContain('canvas-container');
    expect(html).toContain('canvas-node');
    expect(html).toContain('position:absolute');
  });

  it('renders file nodes with filename', async () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'notes/readme.md',
        },
      ],
      edges: [],
    });

    const element = await processCanvas(canvas);
    const html = renderToStaticMarkup(element);

    expect(html).toContain('notes/readme.md');
    expect(html).toContain('canvas-node-file');
  });

  it('embeds resolved .md file content via resolveFile', async () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'notes/readme.md',
        },
      ],
      edges: [],
    });

    const element = await processCanvas(canvas, {
      siteHostname: 'test.flowershow.site',
      resolveFile: async (path) => {
        if (path === 'notes/readme.md')
          return '# My Note\n\nSome **bold** text';
        return null;
      },
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('canvas-node-file-content');
  });

  it('does not resolve .mdx files', async () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'notes/component.mdx',
        },
      ],
      edges: [],
    });

    const element = await processCanvas(canvas, {
      siteHostname: 'test.flowershow.site',
      resolveFile: async () => 'Should not be called',
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('notes/component.mdx');
    expect(html).toContain('canvas-node-file');
    expect(html).not.toContain('canvas-node-file-content');
  });

  it('falls back to filename when resolveFile returns null', async () => {
    const canvas = JSON.stringify({
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

    const element = await processCanvas(canvas, {
      siteHostname: 'test.flowershow.site',
      resolveFile: async () => null,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('notes/missing.md');
    expect(html).toContain('canvas-node-file');
  });

  it('falls back to filename when resolveFile throws', async () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'notes/broken.md',
        },
      ],
      edges: [],
    });

    const element = await processCanvas(canvas, {
      siteHostname: 'test.flowershow.site',
      resolveFile: async () => {
        throw new Error('network error');
      },
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('notes/broken.md');
    expect(html).toContain('canvas-node-file');
    expect(html).not.toContain('canvas-node-file-content');
  });

  it('renders mixed canvas with text and resolved file nodes', async () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 't1',
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          text: 'Some **text**',
        },
        {
          id: 'f1',
          type: 'file',
          x: 300,
          y: 0,
          width: 200,
          height: 100,
          file: 'notes/embed.md',
        },
      ],
      edges: [
        {
          id: 'e1',
          fromNode: 't1',
          toNode: 'f1',
          fromSide: 'right',
          toSide: 'left',
        },
      ],
    });

    const element = await processCanvas(canvas, {
      siteHostname: 'test.flowershow.site',
      resolveFile: async (path) => {
        if (path === 'notes/embed.md') return 'Embedded *content*';
        return null;
      },
    });
    const html = renderToStaticMarkup(element);

    // Text node markdown rendered
    expect(html).toContain('<strong>text</strong>');
    // File node markdown rendered
    expect(html).toContain('<em>content</em>');
    expect(html).toContain('canvas-node-file-content');
    // Edge rendered
    expect(html).toContain('<path');
  });

  it('handles multiple file nodes with partial resolution', async () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'found.md',
        },
        {
          id: 'f2',
          type: 'file',
          x: 300,
          y: 0,
          width: 200,
          height: 100,
          file: 'missing.md',
        },
        {
          id: 'f3',
          type: 'file',
          x: 0,
          y: 200,
          width: 200,
          height: 100,
          file: 'skip.mdx',
        },
      ],
      edges: [],
    });

    const element = await processCanvas(canvas, {
      siteHostname: 'test.flowershow.site',
      resolveFile: async (path) => {
        if (path === 'found.md') return 'Found **it**';
        return null;
      },
    });
    const html = renderToStaticMarkup(element);

    // First file: resolved
    expect(html).toContain('<strong>it</strong>');
    // Second file: fallback to filename
    expect(html).toContain('missing.md');
    // Third file (.mdx): fallback to filename, resolveFile not called
    expect(html).toContain('skip.mdx');
  });

  it('does not resolve file nodes without a file property', async () => {
    const canvas = JSON.stringify({
      nodes: [{ id: 'f1', type: 'file', x: 0, y: 0, width: 200, height: 100 }],
      edges: [],
    });

    const element = await processCanvas(canvas, {
      siteHostname: 'test.flowershow.site',
      resolveFile: async () => 'Should not be called',
    });
    const html = renderToStaticMarkup(element);

    expect(html).not.toContain('canvas-node-file-content');
    expect(html).not.toContain('canvas-node-file');
  });

  it('renders edges as SVG bezier curves', async () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'a',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          text: 'A',
        },
        {
          id: 'b',
          type: 'text',
          x: 200,
          y: 0,
          width: 100,
          height: 50,
          text: 'B',
        },
      ],
      edges: [
        {
          id: 'e1',
          fromNode: 'a',
          toNode: 'b',
          fromSide: 'right',
          toSide: 'left',
        },
      ],
    });

    const element = await processCanvas(canvas);
    const html = renderToStaticMarkup(element);

    expect(html).toContain('<svg');
    expect(html).toContain('<path');
    // Bezier curve command
    expect(html).toContain(' C ');
  });

  it('renders arrowheads when toEnd is "arrow"', async () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'a',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          text: 'A',
        },
        {
          id: 'b',
          type: 'text',
          x: 200,
          y: 0,
          width: 100,
          height: 50,
          text: 'B',
        },
      ],
      edges: [
        {
          id: 'e1',
          fromNode: 'a',
          toNode: 'b',
          fromSide: 'right',
          toSide: 'left',
          toEnd: 'arrow',
        },
      ],
    });

    const element = await processCanvas(canvas);
    const html = renderToStaticMarkup(element);

    expect(html).toContain('<defs>');
    expect(html).toContain('<marker');
    expect(html).toContain('marker-end="url(#arrow-e1)"');
  });
});
