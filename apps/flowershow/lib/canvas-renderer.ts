/**
 * Canvas renderer - converts JSON Canvas data to HTML HAST elements.
 *
 * Renders nodes as HTML divs with absolute positioning (supporting rich text,
 * word wrap, CSS styling) and edges as an SVG overlay with bezier curves.
 *
 * Originally adapted from rehype-jsoncanvas (MIT license), rewritten to use
 * HTML/CSS rendering inspired by github.com/flowershow/flowershow/commit/231a76be.
 *
 * The HTML approach is superior to pure SVG for node rendering because:
 * - Text wraps naturally in divs
 * - Full CSS styling works (fonts, colors, sizing)
 * - Text is selectable and copyable
 * - Markdown content can be embedded in nodes (for standalone pages)
 */

import type { Element } from 'hast';
import { h, s } from 'hastscript';

// ---- Types (replaces @trbn/jsoncanvas dependency) ----

export interface CanvasNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  label?: string;
  file?: string;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  fromEnd?: string;
  toEnd?: string;
  label?: string;
  color?: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export function parseCanvasData(content: string): CanvasData {
  const raw = JSON.parse(content);
  return {
    nodes: raw.nodes ?? [],
    edges: raw.edges ?? [],
  };
}

// ---- Options ----

export interface CanvasRenderOptions {
  /** Stroke width for node borders. Default: 2 */
  nodeStrokeWidth?: number;
  /** Stroke width for edge lines. Default: 2 */
  lineStrokeWidth?: number;
}

const defaults: Required<CanvasRenderOptions> = {
  nodeStrokeWidth: 2,
  lineStrokeWidth: 2,
};

// ---- Colors ----

// Obsidian canvas color presets
const COLOR_MAP: Record<string, { bg: string; border: string }> = {
  '1': { bg: 'rgba(255, 0, 0, 0.15)', border: 'rgba(255, 0, 0, 0.8)' },
  '2': { bg: 'rgba(255, 100, 0, 0.15)', border: 'rgba(255, 100, 0, 0.8)' },
  '3': { bg: 'rgba(255, 255, 0, 0.15)', border: 'rgba(200, 180, 0, 0.8)' },
  '4': { bg: 'rgba(0, 200, 100, 0.15)', border: 'rgba(0, 150, 50, 0.8)' },
  '5': { bg: 'rgba(0, 200, 255, 0.15)', border: 'rgba(0, 150, 200, 0.8)' },
  '6': { bg: 'rgba(150, 50, 200, 0.15)', border: 'rgba(150, 50, 200, 0.8)' },
};

const DEFAULT_COLOR = {
  bg: 'rgba(var(--canvas-node-bg, 240, 240, 240), 0.5)',
  border: 'rgba(var(--canvas-node-border, 180, 180, 180), 1)',
};

export const CANVAS_COLOR_MAP = COLOR_MAP;
export const CANVAS_DEFAULT_COLOR = DEFAULT_COLOR;

const PADDING = 20;

// ---- Layout calculation ----

export function calculateLayout(nodes: CanvasNode[]) {
  if (nodes.length === 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
    offsetX: -minX + PADDING,
    offsetY: -minY + PADDING,
  };
}

// ---- Edge coordinate helpers ----

export function getEdgePoint(
  node: CanvasNode,
  side: string | undefined,
  offsetX: number,
  offsetY: number,
) {
  const nx = node.x + offsetX;
  const ny = node.y + offsetY;

  switch (side) {
    case 'top':
      return { x: nx + node.width / 2, y: ny };
    case 'bottom':
      return { x: nx + node.width / 2, y: ny + node.height };
    case 'left':
      return { x: nx, y: ny + node.height / 2 };
    case 'right':
    default:
      return { x: nx + node.width, y: ny + node.height / 2 };
  }
}

// ---- HAST builders ----

function buildNodeElement(
  node: CanvasNode,
  offsetX: number,
  offsetY: number,
  options: Required<CanvasRenderOptions>,
): Element {
  const color = COLOR_MAP[node.color ?? ''] ?? DEFAULT_COLOR;
  const nx = node.x + offsetX;
  const ny = node.y + offsetY;

  const style = [
    'position: absolute',
    `left: ${nx}px`,
    `top: ${ny}px`,
    `width: ${node.width}px`,
    `height: ${node.height}px`,
    `background: ${color.bg}`,
    `border: ${options.nodeStrokeWidth}px solid ${color.border}`,
    'border-radius: 6px',
    'padding: 8px 12px',
    'overflow: auto',
    'box-sizing: border-box',
    'font-size: 14px',
    'line-height: 1.5',
  ].join('; ');

  const children: Element['children'] = [];

  if (node.label) {
    children.push(
      h(
        'div',
        {
          className: 'canvas-node-label',
          style:
            'font-size: 12px; font-weight: bold; margin-bottom: 4px; opacity: 0.7;',
        },
        node.label,
      ),
    );
  }

  if (node.type === 'text' && node.text) {
    children.push(h('div', { className: 'canvas-node-content' }, node.text));
  }

  if (node.type === 'file' && node.file) {
    children.push(
      h(
        'div',
        {
          className: ['canvas-node-content', 'canvas-node-file'],
          style: 'opacity: 0.7; font-style: italic;',
        },
        node.file,
      ),
    );
  }

  return h(
    'div',
    {
      className: 'canvas-node',
      'data-node-id': node.id,
      style,
    },
    children,
  );
}

function buildArrowMarker(id: string, color: string): Element {
  return s(
    'marker',
    {
      id,
      markerWidth: 10,
      markerHeight: 7,
      refX: 9,
      refY: 3.5,
      orient: 'auto',
      markerUnits: 'strokeWidth',
    },
    s('path', { d: 'M0,0 L0,7 L10,3.5 z', fill: color }),
  );
}

function buildEdgePath(
  edge: CanvasEdge,
  nodes: CanvasNode[],
  offsetX: number,
  offsetY: number,
  options: Required<CanvasRenderOptions>,
): Element[] {
  const fromNode = nodes.find((n) => n.id === edge.fromNode);
  const toNode = nodes.find((n) => n.id === edge.toNode);
  if (!fromNode || !toNode) return [];

  const start = getEdgePoint(fromNode, edge.fromSide, offsetX, offsetY);
  const end = getEdgePoint(toNode, edge.toSide, offsetX, offsetY);

  const edgeColor = edge.color
    ? (COLOR_MAP[edge.color]?.border ?? 'currentColor')
    : 'currentColor';

  const pathProps: Record<string, any> = {
    d: `M ${start.x} ${start.y} C ${start.x} ${end.y}, ${end.x} ${start.y}, ${end.x} ${end.y}`,
    stroke: edgeColor,
    'stroke-width': options.lineStrokeWidth,
    fill: 'none',
  };

  const elements: Element[] = [];

  if (edge.toEnd === 'arrow') {
    const markerId = `arrow-${edge.id}`;
    elements.push(buildArrowMarker(markerId, edgeColor));
    pathProps['marker-end'] = `url(#${markerId})`;
  }

  if (edge.fromEnd === 'arrow') {
    const markerId = `arrow-start-${edge.id}`;
    elements.push(buildArrowMarker(markerId, edgeColor));
    pathProps['marker-start'] = `url(#${markerId})`;
  }

  elements.push(s('path', pathProps));

  if (edge.label) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    elements.push(
      s(
        'text',
        {
          x: midX,
          y: midY - 8,
          'font-size': 13,
          'text-anchor': 'middle',
          fill: 'currentColor',
          'stroke-width': 0,
        },
        edge.label,
      ),
    );
  }

  return elements;
}

// ---- Main render function ----

/**
 * Render canvas data to an HTML HAST Element.
 *
 * Produces a container div with:
 * - Absolutely positioned divs for each node
 * - An SVG overlay for edges (bezier curves)
 *
 * Text nodes contain plain text. For rich markdown rendering in standalone
 * pages, use processCanvas() in process-canvas.ts instead.
 */
export function renderCanvas(
  canvas: CanvasData,
  config?: Partial<CanvasRenderOptions>,
): Element {
  const options = { ...defaults, ...config };
  const { width, height, offsetX, offsetY } = calculateLayout(canvas.nodes);

  const nodeElements = canvas.nodes.map((node) =>
    buildNodeElement(node, offsetX, offsetY, options),
  );

  const edgeElements = canvas.edges.flatMap((edge) =>
    buildEdgePath(edge, canvas.nodes, offsetX, offsetY, options),
  );

  // Separate marker defs from paths/text
  const markers = edgeElements.filter(
    (el) => el.type === 'element' && el.tagName === 'marker',
  );
  const paths = edgeElements.filter(
    (el) => !(el.type === 'element' && el.tagName === 'marker'),
  );

  const svgChildren: Element[] = [];
  if (markers.length > 0) {
    svgChildren.push(s('defs', markers));
  }
  svgChildren.push(...paths);

  const svgOverlay = s(
    'svg',
    {
      style:
        'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    svgChildren,
  );

  return h(
    'div',
    {
      className: 'canvas-container',
      style: `position: relative; width: 100%; height: ${height}px;`,
    },
    [...nodeElements, svgOverlay],
  );
}
