import { describe, expect, it } from 'vitest';
import { parseCanvasData, renderCanvas } from '../canvas-renderer';

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
    expect(data.nodes[0].text).toBe('Hello World');
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
    expect(paths).toHaveLength(1);
    expect(paths[0].properties.d).toContain('M');
    expect(paths[0].properties.d).toContain('C');
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

    // Edge paths use stroke-width attribute
    const paths = findElements(result, 'path');
    const pathStroke =
      paths[0].properties['stroke-width'] ?? paths[0].properties.strokeWidth;
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
