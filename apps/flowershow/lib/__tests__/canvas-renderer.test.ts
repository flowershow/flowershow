import JSONCanvas from '@trbn/jsoncanvas';
import { describe, expect, it } from 'vitest';
import { renderCanvas } from '../canvas-renderer';

// Minimal canvas with two text nodes and an edge
const SIMPLE_CANVAS = JSON.stringify({
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
});

// Canvas with colored nodes
const COLORED_CANVAS = JSON.stringify({
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
});

// Canvas with file node
const FILE_CANVAS = JSON.stringify({
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
});

// Canvas with labeled node and edge label
const LABELED_CANVAS = JSON.stringify({
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
});

// Empty canvas
const EMPTY_CANVAS = JSON.stringify({ nodes: [], edges: [] });

describe('renderCanvas', () => {
  it('renders a simple canvas with nodes and edges', () => {
    const jsc = JSONCanvas.fromString(SIMPLE_CANVAS);
    const svg = renderCanvas(jsc);

    expect(svg.tagName).toBe('svg');
    expect(svg.properties.viewBox).toBeDefined();

    // Should have children (groups for nodes + path for edge)
    expect(svg.children.length).toBeGreaterThanOrEqual(3);

    // Find text elements
    const allText = findElements(svg, 'text');
    const textContents = allText.map((t) =>
      t.children
        .filter((c): c is { type: 'text'; value: string } => c.type === 'text')
        .map((c) => c.value)
        .join(''),
    );
    expect(textContents).toContain('Hello World');
    expect(textContents).toContain('Second Node');

    // Find path element (edge)
    const paths = findElements(svg, 'path');
    expect(paths.length).toBe(1);
    expect(paths[0].properties.d).toContain('M');
    expect(paths[0].properties.d).toContain('C');
  });

  it('renders colored nodes with correct fill colors', () => {
    const jsc = JSONCanvas.fromString(COLORED_CANVAS);
    const svg = renderCanvas(jsc);

    const rects = findElements(svg, 'rect');
    expect(rects.length).toBe(2);

    // Red node (color: '1')
    expect(rects[0].properties.fill).toBe('rgba(255, 0, 0, .5)');
    expect(rects[0].properties.stroke).toBe('rgba(255,0,0,1)');

    // Green node (color: '4')
    expect(rects[1].properties.fill).toBe('rgba(0, 255, 100, .5)');
    expect(rects[1].properties.stroke).toBe('rgba(0,100,0,1)');
  });

  it('renders file nodes with filename', () => {
    const jsc = JSONCanvas.fromString(FILE_CANVAS);
    const svg = renderCanvas(jsc);

    const texts = findElements(svg, 'text');
    const fileText = texts.find((t) =>
      t.children.some(
        (c: any) => c.type === 'text' && c.value.includes('example.md'),
      ),
    );
    expect(fileText).toBeDefined();
  });

  it('renders node labels and edge labels', () => {
    const jsc = JSONCanvas.fromString(LABELED_CANVAS);
    const svg = renderCanvas(jsc);

    const allText = findElements(svg, 'text');
    const textValues = allText.flatMap((t) =>
      t.children
        .filter((c): c is any => c.type === 'text')
        .map((c) => c.value),
    );

    expect(textValues).toContain('Start');
    expect(textValues).toContain('connects to');
  });

  it('renders an empty canvas as a valid SVG', () => {
    const jsc = JSONCanvas.fromString(EMPTY_CANVAS);
    const svg = renderCanvas(jsc);

    expect(svg.tagName).toBe('svg');
    // Empty canvas should still produce a valid SVG element
    expect(svg.children.length).toBe(0);
  });

  it('respects custom stroke width options', () => {
    const jsc = JSONCanvas.fromString(SIMPLE_CANVAS);
    const svg = renderCanvas(jsc, {
      nodeStrokeWidth: 1,
      lineStrokeWidth: 2,
    });

    const rects = findElements(svg, 'rect');
    // hastscript normalizes stroke-width to strokeWidth in properties
    const rectStroke =
      rects[0].properties['stroke-width'] ?? rects[0].properties.strokeWidth;
    expect(rectStroke).toBe(1);

    const paths = findElements(svg, 'path');
    const pathStroke =
      paths[0].properties['stroke-width'] ?? paths[0].properties.strokeWidth;
    expect(pathStroke).toBe(2);
  });

  it('uses responsive width', () => {
    const jsc = JSONCanvas.fromString(SIMPLE_CANVAS);
    const svg = renderCanvas(jsc);

    expect(svg.properties.width).toBe('100%');
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
