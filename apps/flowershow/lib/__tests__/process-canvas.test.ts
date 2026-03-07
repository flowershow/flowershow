import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { processCanvas } from '../process-canvas';

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

  it('renders edges as SVG bezier curves', async () => {
    const canvas = JSON.stringify({
      nodes: [
        { id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'A' },
        { id: 'b', type: 'text', x: 200, y: 0, width: 100, height: 50, text: 'B' },
      ],
      edges: [
        { id: 'e1', fromNode: 'a', toNode: 'b', fromSide: 'right', toSide: 'left' },
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
        { id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'A' },
        { id: 'b', type: 'text', x: 200, y: 0, width: 100, height: 50, text: 'B' },
      ],
      edges: [
        { id: 'e1', fromNode: 'a', toNode: 'b', fromSide: 'right', toSide: 'left', toEnd: 'arrow' },
      ],
    });

    const element = await processCanvas(canvas);
    const html = renderToStaticMarkup(element);

    expect(html).toContain('<defs>');
    expect(html).toContain('<marker');
    expect(html).toContain('marker-end="url(#arrow-e1)"');
  });
});
