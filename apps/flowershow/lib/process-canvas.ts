/**
 * Process a JSON Canvas file for standalone page rendering.
 *
 * For standalone canvas pages, text nodes are processed through a markdown
 * pipeline so they render with full formatting (headings, callouts, code, etc).
 * Builds JSX directly (not via HAST) so we can use dangerouslySetInnerHTML
 * for the processed markdown HTML.
 *
 * For inline canvas embeds (via rehype plugin), text nodes are rendered as
 * plain text — see rehype-json-canvas.ts.
 */

import remarkCallout from '@r4ai/remark-callout';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import * as runtime from 'react/jsx-runtime';
import { unified } from 'unified';
import {
  type CanvasEdge,
  type CanvasNode,
  type CanvasRenderOptions,
  CANVAS_COLOR_MAP,
  CANVAS_DEFAULT_COLOR,
  calculateLayout,
  getEdgePoint,
  parseCanvasData,
} from './canvas-renderer';

const rendererDefaults: Required<CanvasRenderOptions> = {
  nodeStrokeWidth: 2,
  lineStrokeWidth: 2,
};

/**
 * Render markdown text to an HTML string using a lightweight pipeline.
 * Supports GFM, callouts, math, and syntax highlighting.
 */
async function renderMarkdownToHtml(text: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkCallout)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex, { output: 'htmlAndMathml' })
    .use(rehypePrismPlus, { ignoreMissing: true })
    .use(rehypeStringify)
    .process(text);

  return String(result);
}

function getNodeColor(colorKey?: string) {
  return CANVAS_COLOR_MAP[colorKey ?? ''] ?? CANVAS_DEFAULT_COLOR;
}

function buildNodeJsx(
  node: CanvasNode & { _html?: string },
  offsetX: number,
  offsetY: number,
  options: Required<CanvasRenderOptions>,
) {
  const color = getNodeColor(node.color);
  const nx = node.x + offsetX;
  const ny = node.y + offsetY;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: nx,
    top: ny,
    width: node.width,
    height: node.height,
    background: color.bg,
    border: `${options.nodeStrokeWidth}px solid ${color.border}`,
    borderRadius: 6,
    padding: '8px 12px',
    overflow: 'auto',
    boxSizing: 'border-box',
    fontSize: 14,
    lineHeight: 1.5,
  };

  const children: React.ReactNode[] = [];

  if (node.label) {
    children.push(
      runtime.jsx('div', {
        key: 'label',
        className: 'canvas-node-label',
        style: {
          fontSize: 12,
          fontWeight: 'bold',
          marginBottom: 4,
          opacity: 0.7,
        },
        children: node.label,
      }),
    );
  }

  if (node.type === 'text') {
    if (node._html) {
      // Processed markdown — render as HTML
      children.push(
        runtime.jsx('div', {
          key: 'content',
          className: 'canvas-node-content',
          dangerouslySetInnerHTML: { __html: node._html },
        }),
      );
    } else if (node.text) {
      children.push(
        runtime.jsx('div', {
          key: 'content',
          className: 'canvas-node-content',
          children: node.text,
        }),
      );
    }
  }

  if (node.type === 'file' && node.file) {
    children.push(
      runtime.jsx('div', {
        key: 'content',
        className: 'canvas-node-content canvas-node-file',
        style: { opacity: 0.7, fontStyle: 'italic' },
        children: node.file,
      }),
    );
  }

  return runtime.jsx('div', {
    key: node.id,
    className: 'canvas-node',
    'data-node-id': node.id,
    style,
    children: children.length === 1 ? children[0] : children,
  });
}

function buildArrowMarkerJsx(id: string, color: string): React.ReactNode {
  return runtime.jsx(
    'marker',
    {
      id,
      markerWidth: 10,
      markerHeight: 7,
      refX: 9,
      refY: 3.5,
      orient: 'auto',
      markerUnits: 'strokeWidth',
      children: runtime.jsx('path', {
        d: 'M0,0 L0,7 L10,3.5 z',
        fill: color,
      }),
    },
    `marker-${id}`,
  );
}

interface EdgeBuildResult {
  markers: React.ReactNode[];
  visuals: React.ReactNode[];
}

function buildEdgeJsx(
  edge: CanvasEdge,
  nodes: CanvasNode[],
  offsetX: number,
  offsetY: number,
  options: Required<CanvasRenderOptions>,
): EdgeBuildResult {
  const fromNode = nodes.find((n) => n.id === edge.fromNode);
  const toNode = nodes.find((n) => n.id === edge.toNode);
  if (!fromNode || !toNode) return { markers: [], visuals: [] };

  const start = getEdgePoint(fromNode, edge.fromSide, offsetX, offsetY);
  const end = getEdgePoint(toNode, edge.toSide, offsetX, offsetY);

  const edgeColor = edge.color
    ? (CANVAS_COLOR_MAP[edge.color]?.border ?? 'currentColor')
    : 'currentColor';

  const markers: React.ReactNode[] = [];
  const pathProps: Record<string, any> = {
    d: `M ${start.x} ${start.y} C ${start.x} ${end.y}, ${end.x} ${start.y}, ${end.x} ${end.y}`,
    stroke: edgeColor,
    strokeWidth: options.lineStrokeWidth,
    fill: 'none',
  };

  if (edge.toEnd === 'arrow') {
    const markerId = `arrow-${edge.id}`;
    markers.push(buildArrowMarkerJsx(markerId, edgeColor));
    pathProps.markerEnd = `url(#${markerId})`;
  }

  if (edge.fromEnd === 'arrow') {
    const markerId = `arrow-start-${edge.id}`;
    markers.push(buildArrowMarkerJsx(markerId, edgeColor));
    pathProps.markerStart = `url(#${markerId})`;
  }

  const visuals: React.ReactNode[] = [
    runtime.jsx('path', pathProps, `path-${edge.id}`),
  ];

  if (edge.label) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    visuals.push(
      runtime.jsx(
        'text',
        {
          x: midX,
          y: midY - 8,
          fontSize: 13,
          textAnchor: 'middle',
          fill: 'currentColor',
          strokeWidth: 0,
          children: edge.label,
        },
        `label-${edge.id}`,
      ),
    );
  }

  return { markers, visuals };
}

/**
 * Process canvas for standalone page rendering.
 *
 * Processes markdown in text nodes, then renders the canvas as JSX with
 * positioned divs for nodes and an SVG overlay for edges.
 */
export async function processCanvas(
  content: string,
  config?: Partial<CanvasRenderOptions>,
): Promise<React.JSX.Element> {
  const canvas = parseCanvasData(content);
  const options = { ...rendererDefaults, ...config };
  const { width, height, offsetX, offsetY } = calculateLayout(canvas.nodes);

  // Process markdown in text nodes
  const processedNodes: Array<CanvasNode & { _html?: string }> =
    await Promise.all(
      canvas.nodes.map(async (node) => {
        if (node.type === 'text' && node.text) {
          const html = await renderMarkdownToHtml(node.text);
          return { ...node, _html: html };
        }
        return node;
      }),
    );

  const nodeElements = processedNodes.map((node) =>
    buildNodeJsx(node, offsetX, offsetY, options),
  );

  const edgeResults = canvas.edges.map((edge) =>
    buildEdgeJsx(edge, canvas.nodes, offsetX, offsetY, options),
  );

  const allMarkers = edgeResults.flatMap((r) => r.markers);
  const allVisuals = edgeResults.flatMap((r) => r.visuals);

  const svgChildren: React.ReactNode[] = [];
  if (allMarkers.length > 0) {
    svgChildren.push(
      runtime.jsx('defs', { key: 'defs', children: allMarkers }),
    );
  }
  svgChildren.push(...allVisuals);

  const svgOverlay = runtime.jsx('svg', {
    key: 'edges',
    style: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none' as const,
    },
    xmlns: 'http://www.w3.org/2000/svg',
    children: svgChildren,
  });

  return runtime.jsx('div', {
    className: 'canvas-page',
    children: runtime.jsx('div', {
      className: 'canvas-container',
      style: {
        position: 'relative' as const,
        width: '100%',
        height,
      },
      children: [...nodeElements, svgOverlay],
    }),
  });
}
