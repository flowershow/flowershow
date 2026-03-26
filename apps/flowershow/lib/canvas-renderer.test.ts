import { describe, expect, it } from 'vitest';
import {
  enrichCanvasNodes,
  parseCanvasData,
  renderCanvas,
} from './canvas-renderer';

// Minimal canvas with two text nodes and an edge
const SIMPLE_CANVAS = {
  nodes: [
    {
      id: 'node1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      text: 'Hello World',
    },
    {
      id: 'node2',
      type: 'text',
      x: 300,
      y: 0,
      width: 200,
      height: 100,
      text: 'Second Node',
    },
  ],
  edges: [
    {
      id: 'edge1',
      fromNode: 'node1',
      toNode: 'node2',
      fromSide: 'right',
      toSide: 'left',
    },
  ],
};

// Canvas with colored nodes
const COLORED_CANVAS = {
  nodes: [
    {
      id: 'red',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      text: 'Red',
      color: '1',
    },
    {
      id: 'green',
      type: 'text',
      x: 200,
      y: 0,
      width: 100,
      height: 50,
      text: 'Green',
      color: '4',
    },
  ],
  edges: [],
};

// Canvas with file node
const FILE_CANVAS = {
  nodes: [
    {
      id: 'file1',
      type: 'file',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      file: 'notes/example.md',
    },
  ],
  edges: [],
};

// Canvas with labeled node and edge label
const LABELED_CANVAS = {
  nodes: [
    {
      id: 'a',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      text: 'A',
      label: 'Start',
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
      label: 'connects to',
    },
  ],
};

// Empty canvas
const EMPTY_CANVAS = { nodes: [], edges: [] };

/** Check if an element has a given class (hastscript stores className as array) */
function hasClass(el: any, cls: string): boolean {
  const cn = el.properties?.className;
  if (Array.isArray(cn)) return cn.includes(cls);
  return cn === cls;
}

describe('parseCanvasData', () => {
  it('parses a JSON string into CanvasData', () => {
    const data = parseCanvasData(JSON.stringify(SIMPLE_CANVAS));
    expect(data.nodes).toHaveLength(2);
    expect(data.edges).toHaveLength(1);
    expect(data.nodes[0]?.text).toBe('Hello World');
  });

  it('handles missing nodes/edges gracefully', () => {
    const data = parseCanvasData('{}');
    expect(data.nodes).toEqual([]);
    expect(data.edges).toEqual([]);
  });
});

describe('renderCanvas', () => {
  it('renders a simple canvas with nodes and edges', () => {
    const result = renderCanvas(SIMPLE_CANVAS);

    // Container is a div, not an SVG
    expect(result.tagName).toBe('div');
    expect(hasClass(result, 'canvas-container')).toBe(true);

    // Should contain node divs
    const nodeDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node'),
    );
    expect(nodeDivs).toHaveLength(2);

    // Check text content is in divs
    const contentDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-content'),
    );
    const texts = contentDivs.flatMap((div) =>
      div.children
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.value),
    );
    expect(texts).toContain('Hello World');
    expect(texts).toContain('Second Node');

    // SVG overlay with edge path
    const svgs = findElements(result, 'svg');
    expect(svgs).toHaveLength(1);
    const paths = findElements(svgs[0], 'path');
    // Includes the edge path plus an arrow marker path
    const edgePaths = paths.filter((p) => String(p.properties.d).includes('C'));
    expect(edgePaths).toHaveLength(1);
    expect(edgePaths[0].properties.d).toContain('M');
  });

  it('renders colored nodes with correct background colors', () => {
    const result = renderCanvas(COLORED_CANVAS);

    const nodeDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node'),
    );
    expect(nodeDivs).toHaveLength(2);

    // Red node (color: '1')
    const redStyle = nodeDivs[0].properties.style as string;
    expect(redStyle).toContain('rgba(255, 0, 0');

    // Green node (color: '4')
    const greenStyle = nodeDivs[1].properties.style as string;
    expect(greenStyle).toContain('rgba(0, 200, 100');
  });

  it('renders custom hex colors on nodes', () => {
    const canvas = {
      nodes: [
        {
          id: 'hex1',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          text: 'Custom',
          color: '#aa33ff',
        },
      ],
      edges: [],
    };
    const result = renderCanvas(canvas);

    const nodeDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node'),
    );
    expect(nodeDivs).toHaveLength(1);

    const style = nodeDivs[0].properties.style as string;
    expect(style).toContain('#aa33ff26');
  });

  it('renders file nodes with filename', () => {
    const result = renderCanvas(FILE_CANVAS);

    const fileDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file'),
    );
    expect(fileDivs).toHaveLength(1);

    const text = fileDivs[0].children
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.value)
      .join('');
    expect(text).toContain('example.md');
  });

  it('embeds resolved .md file content in file nodes via _html', () => {
    const canvas = {
      nodes: [
        {
          id: 'file1',
          type: 'file',
          x: 0,
          y: 0,
          width: 300,
          height: 200,
          file: 'notes/example.md',
          _html: '<p>Hello from the note</p>',
        },
      ],
      edges: [],
    };
    const result = renderCanvas(canvas);

    const contentDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file-content'),
    );
    expect(contentDivs).toHaveLength(1);

    // Raw HTML node with the resolved content
    const rawChild = contentDivs[0].children[0];
    expect(rawChild.type).toBe('raw');
    expect(rawChild.value).toContain('Hello from the note');
  });

  it('falls back to filename for file nodes without resolved content', () => {
    const result = renderCanvas(FILE_CANVAS);

    const fileDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file'),
    );
    expect(fileDivs).toHaveLength(1);
    expect(
      fileDivs[0].children.some(
        (c: any) => c.type === 'text' && c.value.includes('example.md'),
      ),
    ).toBe(true);
  });

  it('shows filename fallback for file nodes without _html', () => {
    const mdxCanvas = {
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'doc.mdx',
        },
      ],
      edges: [],
    };
    const result = renderCanvas(mdxCanvas);

    const contentDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file-content'),
    );
    expect(contentDivs).toHaveLength(0);

    // Should show filename fallback
    const fileDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file'),
    );
    expect(fileDivs).toHaveLength(1);
  });

  it('renders mixed canvas with text and file nodes side by side', () => {
    const mixedCanvas = {
      nodes: [
        {
          id: 'txt',
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          text: 'A text node',
        },
        {
          id: 'f1',
          type: 'file',
          x: 300,
          y: 0,
          width: 200,
          height: 100,
          file: 'notes/intro.md',
          _html: '<p>Intro content</p>',
        },
      ],
      edges: [
        {
          id: 'e1',
          fromNode: 'txt',
          toNode: 'f1',
          fromSide: 'right',
          toSide: 'left',
        },
      ],
    };
    const result = renderCanvas(mixedCanvas);

    // Text node renders its text
    const contentDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-content'),
    );
    const textValues = contentDivs.flatMap((div) =>
      div.children
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.value),
    );
    expect(textValues).toContain('A text node');

    // File node renders embedded content
    const fileDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file-content'),
    );
    expect(fileDivs).toHaveLength(1);
    expect(fileDivs[0].children[0].value).toContain('Intro content');

    // Both nodes are positioned
    const nodeDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node'),
    );
    expect(nodeDivs).toHaveLength(2);

    // Edge still renders
    const paths = findElements(result, 'path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it('handles multiple file nodes with partial _html enrichment', () => {
    const canvas = {
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          file: 'resolved.md',
          _html: '<p>Resolved</p>',
        },
        {
          id: 'f2',
          type: 'file',
          x: 300,
          y: 0,
          width: 200,
          height: 100,
          file: 'unresolved.md',
        },
        {
          id: 'f3',
          type: 'file',
          x: 0,
          y: 200,
          width: 200,
          height: 100,
          file: 'image.png',
        },
      ],
      edges: [],
    };
    const result = renderCanvas(canvas);

    // First file: embedded content
    const embeddedDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file-content'),
    );
    expect(embeddedDivs).toHaveLength(1);

    // Second file: fallback to filename
    const fallbackDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file'),
    );
    expect(fallbackDivs).toHaveLength(1);

    // Third file (image.png): rendered as media node
    const mediaDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-media'),
    );
    expect(mediaDivs).toHaveLength(1);
  });

  it('renders file node label alongside embedded content', () => {
    const canvas = {
      nodes: [
        {
          id: 'f1',
          type: 'file',
          x: 0,
          y: 0,
          width: 200,
          height: 150,
          file: 'notes/labeled.md',
          label: 'Important Note',
          _html: '<p>Note body</p>',
        },
      ],
      edges: [],
    };
    const result = renderCanvas(canvas);

    // Label should be present
    const labelDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-label'),
    );
    expect(labelDivs).toHaveLength(1);
    expect(
      labelDivs[0].children.some(
        (c: any) => c.type === 'text' && c.value === 'Important Note',
      ),
    ).toBe(true);

    // Embedded content should also be present
    const contentDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file-content'),
    );
    expect(contentDivs).toHaveLength(1);
  });

  it('shows filename fallback for file nodes without _html regardless of extension', () => {
    const extensions = ['doc.txt', 'data.json', 'page.html'];
    for (const file of extensions) {
      const canvas = {
        nodes: [
          { id: 'f1', type: 'file', x: 0, y: 0, width: 200, height: 100, file },
        ],
        edges: [],
      };
      const result = renderCanvas(canvas);

      const embedded = findElements(result, 'div').filter((el) =>
        hasClass(el, 'canvas-node-file-content'),
      );
      expect(embedded).toHaveLength(0);
    }
  });

  it('renders node labels and edge labels', () => {
    const result = renderCanvas(LABELED_CANVAS);

    // Node label
    const labelDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-label'),
    );
    const labelTexts = labelDivs.flatMap((div) =>
      div.children
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.value),
    );
    expect(labelTexts).toContain('Start');

    // Edge label (in SVG)
    const svgTexts = findElements(result, 'text');
    const edgeLabelTexts = svgTexts.flatMap((t) =>
      t.children.filter((c: any) => c.type === 'text').map((c: any) => c.value),
    );
    expect(edgeLabelTexts).toContain('connects to');
  });

  it('renders an empty canvas as a valid container', () => {
    const result = renderCanvas(EMPTY_CANVAS);

    expect(result.tagName).toBe('div');
    expect(hasClass(result, 'canvas-container')).toBe(true);
  });

  it('respects custom stroke width options', () => {
    const result = renderCanvas(SIMPLE_CANVAS, {
      nodeStrokeWidth: 4,
      lineStrokeWidth: 3,
    });

    // Node borders use CSS style
    const nodeDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node'),
    );
    expect(nodeDivs.length).toBeGreaterThan(0);
    const style = nodeDivs[0].properties.style as string;
    expect(style).toContain('border: 4px solid');

    // Edge paths use stroke-width attribute (filter out arrow marker paths)
    const paths = findElements(result, 'path');
    const edgePath = paths.find((p) => String(p.properties.d).includes('C'));
    expect(edgePath).toBeDefined();
    const pathStroke =
      edgePath?.properties['stroke-width'] ?? edgePath?.properties.strokeWidth;
    expect(pathStroke).toBe(3);
  });

  it('nodes use absolute positioning', () => {
    const result = renderCanvas(SIMPLE_CANVAS);

    const nodeDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node'),
    );
    for (const node of nodeDivs) {
      const style = node.properties.style as string;
      expect(style).toContain('position: absolute');
    }
  });

  it('container has pixel height for spatial layout', () => {
    const result = renderCanvas(SIMPLE_CANVAS);
    const style = result.properties.style as string;
    expect(style).toContain('height:');
    expect(style).toContain('px');
  });

  it('renders arrowheads when toEnd is "arrow"', () => {
    const canvas = {
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
    };

    const result = renderCanvas(canvas);

    // Should have a marker definition inside defs
    const defs = findElements(result, 'defs');
    expect(defs).toHaveLength(1);
    const markers = findElements(defs[0], 'marker');
    expect(markers).toHaveLength(1);
    expect(markers[0].properties.id).toBe('arrow-e1');

    // Path should reference the marker (hastscript normalizes marker-end to markerEnd)
    const paths = findElements(result, 'path').filter((p) =>
      p.properties.d?.toString().includes('M'),
    );
    const edgePath = paths.find(
      (p) => p.properties.markerEnd || p.properties['marker-end'],
    );
    expect(edgePath).toBeDefined();
    const markerEnd =
      edgePath!.properties.markerEnd ?? edgePath!.properties['marker-end'];
    expect(markerEnd).toBe('url(#arrow-e1)');
  });

  it('renders pre-rendered HTML in text nodes when _html is set', () => {
    const canvas = {
      nodes: [
        {
          id: 'n1',
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          text: 'Hello **bold**',
          _html: '<p>Hello <strong>bold</strong></p>',
        },
      ],
      edges: [],
    };
    const result = renderCanvas(canvas);

    const contentDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-content'),
    );
    expect(contentDivs).toHaveLength(1);

    // Should use raw HTML, not plain text
    const rawChild = contentDivs[0].children[0];
    expect(rawChild.type).toBe('raw');
    expect(rawChild.value).toContain('<strong>bold</strong>');
  });

  it('falls back to plain text in text nodes when _html is not set', () => {
    const canvas = {
      nodes: [
        {
          id: 'n1',
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          text: 'Plain text',
        },
      ],
      edges: [],
    };
    const result = renderCanvas(canvas);

    const contentDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-content'),
    );
    expect(contentDivs).toHaveLength(1);

    const textChild = contentDivs[0].children[0];
    expect(textChild.type).toBe('text');
    expect(textChild.value).toBe('Plain text');
  });

  it('renders arrowheads by default when toEnd is not set', () => {
    const result = renderCanvas(SIMPLE_CANVAS);

    const defs = findElements(result, 'defs');
    expect(defs.length).toBeGreaterThan(0);

    const paths = findElements(result, 'path').filter(
      (p) => p.properties.markerEnd || p.properties['marker-end'],
    );
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders media (image) file nodes with an img tag', () => {
    const canvas = {
      nodes: [
        {
          id: 'img1',
          type: 'file',
          x: -60,
          y: 290,
          width: 399,
          height: 251,
          file: 'assets/blog-preview.png',
        },
      ],
      edges: [],
    };
    const result = renderCanvas(canvas);

    // Should have a canvas-node-media div
    const mediaDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-media'),
    );
    expect(mediaDivs).toHaveLength(1);

    // Should contain an img element with the file path as src
    const imgs = findElements(result, 'img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].properties.src).toBe('/assets/blog-preview.png');
    expect(imgs[0].properties.alt).toBe('blog-preview.png');
    expect(imgs[0].properties.loading).toBe('lazy');

    // Should NOT have a file fallback or file-content div
    const fileDivs = findElements(result, 'div').filter((el) =>
      hasClass(el, 'canvas-node-file'),
    );
    expect(fileDivs).toHaveLength(0);
  });

  it('does not render arrowheads when toEnd is "none"', () => {
    const canvasData = parseCanvasData(
      JSON.stringify({
        nodes: [
          { id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 50 },
          { id: 'b', type: 'text', x: 200, y: 0, width: 100, height: 50 },
        ],
        edges: [{ id: 'e1', fromNode: 'a', toNode: 'b', toEnd: 'none' }],
      }),
    );
    const result = renderCanvas(canvasData);

    const paths = findElements(result, 'path').filter(
      (p) => p.properties.markerEnd || p.properties['marker-end'],
    );
    expect(paths).toHaveLength(0);
  });
});

describe('enrichCanvasNodes', () => {
  it('processes text nodes through the HTML renderer', async () => {
    const canvas = parseCanvasData(
      JSON.stringify({
        nodes: [
          {
            id: 'n1',
            type: 'text',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            text: '**bold**',
          },
        ],
        edges: [],
      }),
    );

    const enriched = await enrichCanvasNodes(canvas.nodes, {
      renderMarkdown: async (text) =>
        `<p><strong>${text.replace(/\*\*/g, '')}</strong></p>`,
    });

    expect(enriched[0]?._html).toBe('<p><strong>bold</strong></p>');
  });

  it('resolves .md file nodes and renders their content', async () => {
    const canvas = parseCanvasData(
      JSON.stringify({
        nodes: [
          {
            id: 'f1',
            type: 'file',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            file: 'note.md',
          },
        ],
        edges: [],
      }),
    );

    const enriched = await enrichCanvasNodes(canvas.nodes, {
      renderMarkdown: async (text) => `<p>${text}</p>`,
      resolveFile: async (path) => (path === 'note.md' ? 'File content' : null),
    });

    expect(enriched[0]?._html).toBe('<p>File content</p>');
  });

  it('skips .mdx files', async () => {
    const canvas = parseCanvasData(
      JSON.stringify({
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
      }),
    );

    const enriched = await enrichCanvasNodes(canvas.nodes, {
      renderMarkdown: async (text) => `<p>${text}</p>`,
      resolveFile: async () => 'Should not render',
    });

    expect(enriched[0]?._html).toBeUndefined();
  });

  it('leaves nodes unchanged when no renderMarkdown is provided', async () => {
    const canvas = parseCanvasData(
      JSON.stringify({
        nodes: [
          {
            id: 'n1',
            type: 'text',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            text: 'Hello',
          },
        ],
        edges: [],
      }),
    );

    const enriched = await enrichCanvasNodes(canvas.nodes);

    expect(enriched[0]?._html).toBeUndefined();
    expect(enriched[0]?.text).toBe('Hello');
  });

  it('handles resolveFile errors gracefully', async () => {
    const canvas = parseCanvasData(
      JSON.stringify({
        nodes: [
          {
            id: 'f1',
            type: 'file',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            file: 'broken.md',
          },
        ],
        edges: [],
      }),
    );

    const enriched = await enrichCanvasNodes(canvas.nodes, {
      renderMarkdown: async (text) => `<p>${text}</p>`,
      resolveFile: async () => {
        throw new Error('boom');
      },
    });

    expect(enriched[0]?._html).toBeUndefined();
  });
});

// Helper to recursively find all elements with a given tag name
function findElements(node: any, tagName: string): any[] {
  const results: any[] = [];
  if (node.tagName === tagName) results.push(node);
  if (node.children) {
    for (const child of node.children) {
      results.push(...findElements(child, tagName));
    }
  }
  return results;
}
