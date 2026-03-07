/**
 * Canvas renderer - converts JSON Canvas data to SVG HAST elements.
 *
 * Vendored and adapted from rehype-jsoncanvas (MIT license)
 * https://github.com/lovettbarron/rehype-jsoncanvas
 *
 * Changes from upstream:
 * - Removed filesystem/fetch-based file loading (Flowershow uses blob storage)
 * - Simplified options (removed ssrPath, assetPath, mdPath)
 * - Cleaned up types to use @trbn/jsoncanvas directly
 */

import type { Edge, GenericNode, JSONCanvas } from '@trbn/jsoncanvas';
import type { Element } from 'hast';
import { s } from 'hastscript';

export interface CanvasRenderOptions {
  /** Stroke width for node borders. Default: 3 */
  nodeStrokeWidth?: number;
  /** Stroke width for edge lines. Default: 5 */
  lineStrokeWidth?: number;
}

const defaults: Required<CanvasRenderOptions> = {
  nodeStrokeWidth: 3,
  lineStrokeWidth: 5,
};

function applyDefaults(
  config?: Partial<CanvasRenderOptions>,
): Required<CanvasRenderOptions> {
  return { ...defaults, ...config };
}

// Obsidian canvas color presets
const COLOR_MAP: Record<string, { fill: string; stroke: string }> = {
  '1': { fill: 'rgba(255, 0, 0, .5)', stroke: 'rgba(255,0,0,1)' },
  '2': { fill: 'rgba(255, 100, 0, .5)', stroke: 'rgba(255,100,0,1)' },
  '3': { fill: 'rgba(255, 255, 0, .5)', stroke: 'rgba(255,255,0,1)' },
  '4': { fill: 'rgba(0, 255, 100, .5)', stroke: 'rgba(0,100,0,1)' },
  '5': { fill: 'rgba(0, 255, 255, .5)', stroke: 'rgba(0,255,255,1)' },
  '6': { fill: 'rgba(100, 10, 100, .5)', stroke: 'rgba(100,10,100,1)' },
};

const DEFAULT_COLOR = {
  fill: 'rgba(255, 255, 255, .5)',
  stroke: 'rgba(0,0,0,1)',
};

function calculateCanvasSize(jsc: JSONCanvas) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of jsc.getNodes()) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    offsetX: -minX,
    offsetY: -minY,
  };
}

function initSvg(
  width: number,
  height: number,
  options: Required<CanvasRenderOptions>,
): Element {
  return s('svg', {
    version: '1.1',
    xmlns: 'http://www.w3.org/2000/svg',
    'xmlns:xlink': 'http://www.w3.org/1999/xlink',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': options.lineStrokeWidth,
    'fill-rule': 'evenodd',
    fill: 'currentColor',
    stroke: 'currentColor',
    width: '100%',
    height: '100%',
    renWidth: width,
    renHeight: height,
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
}

function drawNode(
  svg: Element,
  node: GenericNode & { color?: string; text?: string; label?: string; file?: string; type: string },
  options: Required<CanvasRenderOptions>,
) {
  const color = COLOR_MAP[node.color ?? ''] ?? DEFAULT_COLOR;
  const cW = svg.properties.renWidth as number;
  const cH = svg.properties.renHeight as number;

  const group = s('g');

  // Node rectangle
  group.children.push(
    s('rect', {
      x: node.x + cW / 2,
      y: node.y + cH / 2,
      width: node.width,
      height: node.height,
      rx: 5,
      ry: 5,
      stroke: color.stroke,
      fill: color.fill,
      'stroke-width': options.nodeStrokeWidth,
    }),
  );

  // Label above the node
  if (node.label) {
    group.children.push(
      s(
        'text',
        {
          x: node.x + 5 + cW / 2,
          y: node.y - 10 + cH / 2,
          'font-family': 'monospace',
          'font-size': 20,
          'stroke-width': 1,
        },
        node.label,
      ),
    );
  }

  // Text content inside node
  if (node.type === 'text' && node.text) {
    group.children.push(
      s(
        'text',
        {
          x: node.x + 5 + cW / 2,
          y: node.y + 5 + node.height / 2 + cH / 2,
          'font-family': 'monospace',
          'font-size': 20,
          'stroke-width': 1,
        },
        node.text,
      ),
    );
  }

  // File embed - show filename as text for now
  if (node.type === 'file' && node.file) {
    group.children.push(
      s(
        'text',
        {
          x: node.x + 10 + cW / 2,
          y: node.y + 5 + node.height / 2 + cH / 2,
          'font-family': 'monospace',
          'font-size': 16,
          'stroke-width': 1,
          fill: 'currentColor',
        },
        `📄 ${node.file}`,
      ),
    );
  }

  svg.children.push(group);
}

function drawEdge(
  svg: Element,
  fromNode: GenericNode,
  toNode: GenericNode,
  edge: Edge & { fromSide?: string; toSide?: string; color?: string },
  options: Required<CanvasRenderOptions>,
) {
  const cW = (svg.properties.renWidth as number) || 1;
  const cH = (svg.properties.renHeight as number) || 1;

  let startX =
    fromNode.x +
    (edge.fromSide === 'top' || edge.fromSide === 'bottom'
      ? fromNode.width / 2
      : fromNode.width) +
    cW / 2;
  let startY = fromNode.y + fromNode.height / 2 + cH / 2;
  let endX =
    toNode.x +
    (edge.toSide === 'top' || edge.toSide === 'bottom'
      ? toNode.width / 2
      : toNode.width) +
    cW / 2;
  let endY = toNode.y + toNode.height / 2 + cH / 2;

  if (edge.fromSide === 'left') startX = fromNode.x + cW / 2;
  else if (edge.fromSide === 'top') startY = fromNode.y + cH / 2;
  else if (edge.fromSide === 'bottom')
    startY = fromNode.y + fromNode.height + cH / 2;

  if (edge.toSide === 'right') endX = toNode.x + toNode.width + cW / 2;
  else if (edge.toSide === 'top') endY = toNode.y + cH / 2;
  else if (edge.toSide === 'bottom')
    endY = toNode.y + toNode.height + cH / 2;
  else if (edge.toSide === 'left') endX = toNode.x + cW / 2;

  const edgeColor = edge.color
    ? (COLOR_MAP[edge.color]?.stroke ?? 'black')
    : 'black';

  svg.children.push(
    s('path', {
      d: `M ${startX} ${startY} C ${startX} ${endY}, ${endX} ${startY}, ${endX} ${endY}`,
      stroke: edgeColor,
      'stroke-width': options.lineStrokeWidth,
      fill: 'none',
    }),
  );

  // Edge label
  if ((edge as any).label) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    svg.children.push(
      s(
        'text',
        {
          x: midX,
          y: midY - 10,
          'font-family': 'monospace',
          'font-size': 14,
          'stroke-width': 1,
          'text-anchor': 'middle',
        },
        (edge as any).label,
      ),
    );
  }
}

/**
 * Render a JSONCanvas object to an SVG HAST Element.
 */
export function renderCanvas(
  jsc: JSONCanvas,
  config?: Partial<CanvasRenderOptions>,
): Element {
  const options = applyDefaults(config);
  const { width, height, offsetX, offsetY } = calculateCanvasSize(jsc);

  const svg = initSvg(width + offsetX, height + offsetY, options);

  for (const node of jsc.getNodes()) {
    drawNode(svg, node as any, options);
  }

  for (const edge of jsc.getEdges()) {
    const fromNode = jsc.getNodes().find((n) => n.id === edge.fromNode);
    const toNode = jsc.getNodes().find((n) => n.id === edge.toNode);
    if (fromNode && toNode) {
      drawEdge(svg, fromNode, toNode, edge as any, options);
    }
  }

  return svg;
}
