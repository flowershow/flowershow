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

import { remarkWikiLink } from '@flowershow/remark-wiki-link';
import remarkCallout from '@r4ai/remark-callout';
import matter from 'gray-matter';
import type { Element } from 'hast';
import { h, s } from 'hastscript';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import { remarkMark } from 'remark-mark-highlight';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';
import { unified } from 'unified';
import { getUrlResolver } from './markdown';
import rehypeHtmlEnhancements from './rehype-html-enhancements';
import rehypeResolveHtmlUrls from './rehype-resolve-html-urls';
import rehypeUnwrapParagraphsAroundMedia from './rehype-unwrap-paragraph-around-media';
import remarkCommonMarkLink from './remark-commonmark-link';
import remarkObsidianComments from './remark-obsidian-comments';
import remarkYouTubeAutoEmbed from './remark-youtube-auto-embed';

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
  _html?: string;
  _title?: string;
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

type ResolvedRenderOptions = Required<
  Pick<CanvasRenderOptions, 'nodeStrokeWidth' | 'lineStrokeWidth'>
>;

const defaults: ResolvedRenderOptions = {
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

function resolveColor(color: string | undefined): {
  bg: string;
  border: string;
} {
  if (!color) return DEFAULT_COLOR;
  if (COLOR_MAP[color]) return COLOR_MAP[color];
  const hex = color.startsWith('#') ? color : `#${color}`;
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return {
      bg: `${hex}26`,
      border: `${hex}cc`,
    };
  }
  return DEFAULT_COLOR;
}

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

/**
 * Build a cubic bezier path string with control points that extend
 * in the direction of each edge's connection side.
 */
export function buildBezierPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  fromSide?: string,
  toSide?: string,
): string {
  const dist = Math.max(
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y),
    50,
  );
  const offset = dist * 0.5;

  // Control point 1: extend from start in the direction of fromSide
  let cx1 = start.x;
  let cy1 = start.y;
  switch (fromSide) {
    case 'right':
      cx1 += offset;
      break;
    case 'left':
      cx1 -= offset;
      break;
    case 'bottom':
      cy1 += offset;
      break;
    case 'top':
      cy1 -= offset;
      break;
    default:
      cx1 += offset;
      break;
  }

  // Control point 2: extend from end in the direction of toSide
  let cx2 = end.x;
  let cy2 = end.y;
  switch (toSide) {
    case 'left':
      cx2 -= offset;
      break;
    case 'right':
      cx2 += offset;
      break;
    case 'top':
      cy2 -= offset;
      break;
    case 'bottom':
      cy2 += offset;
      break;
    default:
      cx2 -= offset;
      break;
  }

  return `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;
}

// ---- Enrichment helper ----

export interface EnrichOptions {
  /** Convert markdown text to an HTML string. */
  renderMarkdown?: (text: string) => Promise<string>;
  /** Resolve a file path to its raw content string. */
  resolveFile?: (path: string) => Promise<string | null>;
  /** Pre-fetched file contents keyed by file path. Checked before resolveFile. */
  canvasNodeFiles?: Record<string, string>;
}

/**
 * Enrich canvas nodes with pre-rendered HTML content.
 *
 * - Text nodes with `text` are passed through `renderMarkdown` (if provided).
 * - File nodes referencing `.md` files are resolved via `resolveFile`, then rendered.
 * - `.mdx` and other file types are left untouched.
 *
 * Returns a new array of nodes with `_html` populated where applicable.
 */
export async function enrichCanvasNodes(
  nodes: CanvasNode[],
  options?: EnrichOptions,
): Promise<CanvasNode[]> {
  const { renderMarkdown, resolveFile, canvasNodeFiles } = options ?? {};
  if (!renderMarkdown) return nodes;

  return Promise.all(
    nodes.map(async (node) => {
      if (node.type === 'text' && node.text) {
        const html = await renderMarkdown(node.text);
        return { ...node, _html: html };
      }
      if (node.type === 'file' && node.file?.endsWith('.md')) {
        // Check pre-fetched content first, then fall back to async resolver
        const content =
          canvasNodeFiles?.[node.file] ??
          canvasNodeFiles?.[`/${node.file}`] ??
          (await resolveFile?.(node.file).catch(() => null)) ??
          null;
        if (content) {
          const { data } = matter(content, {});
          const title =
            data?.title ??
            node.file.split('/').pop()?.replace(/\.md$/, '') ??
            node.file;
          const html = await renderMarkdown(content);
          return { ...node, _html: html, _title: title };
        }
      }
      return node;
    }),
  );
}

// ---- HAST builders ----

function buildNodeElement(
  node: CanvasNode,
  offsetX: number,
  offsetY: number,
  options: ResolvedRenderOptions,
): Element {
  const color = resolveColor(node.color);
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

  if (node.type === 'text') {
    if (node._html) {
      children.push({
        type: 'element',
        tagName: 'div',
        properties: { className: ['canvas-node-content'] },
        children: [{ type: 'raw', value: node._html } as any],
      });
    } else if (node.text) {
      children.push(h('div', { className: 'canvas-node-content' }, node.text));
    }
  }

  if (node.type === 'file' && node.file) {
    const isImage = /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(node.file);
    if (isImage) {
      children.push(
        h(
          'div',
          {
            className: ['canvas-node-content', 'canvas-node-media'],
            style:
              'overflow: hidden; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;',
          },
          h('img', {
            src: node.file.startsWith('/') ? node.file : `/${node.file}`,
            alt: node.file.split('/').pop() ?? node.file,
            style: 'max-width: 100%; max-height: 100%; object-fit: contain;',
            loading: 'lazy',
          }),
        ),
      );
    } else if (node._html) {
      const fileChildren: Element['children'] = [];
      if (node._title) {
        fileChildren.push(
          h(
            'h1',
            { className: 'canvas-node-file-title', style: 'display: block;' },
            node._title,
          ),
        );
      }
      fileChildren.push({ type: 'raw', value: node._html } as any);
      children.push({
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['canvas-node-content', 'canvas-node-file-content'],
        },
        children: fileChildren,
      });
    } else {
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
      markerWidth: 6,
      markerHeight: 4,
      refX: 5.5,
      refY: 2,
      orient: 'auto',
      markerUnits: 'strokeWidth',
    },
    s('path', { d: 'M0,0 L0,4 L6,2 z', fill: color }),
  );
}

function buildEdgePath(
  edge: CanvasEdge,
  nodes: CanvasNode[],
  offsetX: number,
  offsetY: number,
  options: ResolvedRenderOptions,
): Element[] {
  const fromNode = nodes.find((n) => n.id === edge.fromNode);
  const toNode = nodes.find((n) => n.id === edge.toNode);
  if (!fromNode || !toNode) return [];

  const start = getEdgePoint(fromNode, edge.fromSide, offsetX, offsetY);
  const end = getEdgePoint(toNode, edge.toSide, offsetX, offsetY);

  const resolved = resolveColor(edge.color);
  const edgeColor = edge.color ? resolved.border : 'currentColor';

  const pathProps: Record<string, any> = {
    d: buildBezierPath(start, end, edge.fromSide, edge.toSide),
    stroke: edgeColor,
    'stroke-width': options.lineStrokeWidth,
    fill: 'none',
  };

  const elements: Element[] = [];

  if (edge.toEnd !== 'none') {
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
    // Compute the actual midpoint of the cubic bezier curve (t=0.5)
    // B(0.5) = 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
    const dist = Math.max(
      Math.abs(end.x - start.x),
      Math.abs(end.y - start.y),
      50,
    );
    const cpOffset = dist * 0.5;
    let cx1 = start.x;
    let cy1 = start.y;
    switch (edge.fromSide) {
      case 'right':
        cx1 += cpOffset;
        break;
      case 'left':
        cx1 -= cpOffset;
        break;
      case 'bottom':
        cy1 += cpOffset;
        break;
      case 'top':
        cy1 -= cpOffset;
        break;
      default:
        cx1 += cpOffset;
        break;
    }
    let cx2 = end.x;
    let cy2 = end.y;
    switch (edge.toSide) {
      case 'left':
        cx2 -= cpOffset;
        break;
      case 'right':
        cx2 += cpOffset;
        break;
      case 'top':
        cy2 -= cpOffset;
        break;
      case 'bottom':
        cy2 += cpOffset;
        break;
      default:
        cx2 -= cpOffset;
        break;
    }
    const midX = 0.125 * start.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * end.x;
    const midY = 0.125 * start.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * end.y;
    // Background rect behind label for readability
    const labelPadX = 6;
    const labelPadY = 3;
    const approxCharWidth = 7.5;
    const labelWidth = edge.label.length * approxCharWidth + labelPadX * 2;
    const labelHeight = 16 + labelPadY * 2;
    elements.push(
      s('rect', {
        x: midX - labelWidth / 2,
        y: midY - labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
        rx: 4,
        fill: 'var(--canvas-label-bg, #fff)',
      }),
    );
    elements.push(
      s(
        'text',
        {
          x: midX,
          y: midY,
          'font-size': 13,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          fill: 'currentColor',
          'stroke-width': 0,
        },
        edge.label,
      ),
    );
  }

  return elements;
}

// ---- Shared markdown pipeline ----

/**
 * Render markdown text to an HTML string using a lightweight pipeline.
 * Supports GFM, callouts, math, and syntax highlighting.
 *
 * Shared by both the rehype plugin (inline canvas embeds) and the
 * standalone page renderer (processCanvas).
 */
export interface RenderMarkdownOptions {
  files?: string[];
  sitePrefix?: string;
  customDomain?: string;
  permalinks?: Record<string, string>;
}

export async function renderMarkdownToHtml(
  text: string,
  options?: RenderMarkdownOptions,
): Promise<string> {
  const {
    files = [],
    sitePrefix = '',
    customDomain,
    permalinks,
  } = options ?? {};

  // this strips out frontmatter, so that it's not inlined with the rest of the markdown file
  const { content } = matter(text, {});

  const result = await unified()
    .use(remarkParse)
    .use(remarkObsidianComments)
    .use(remarkCommonMarkLink, {
      filePath: '',
      sitePrefix,
      customDomain,
      files,
      permalinks,
    })
    .use(remarkWikiLink, {
      files,
      format: 'shortestPossible',
      urlResolver: getUrlResolver(sitePrefix, customDomain),
      permalinks,
    })
    .use(remarkYouTubeAutoEmbed)
    .use(remarkGfm)
    .use(remarkSmartypants, { quotes: false, dashes: 'oldschool' })
    .use(remarkMath)
    .use(remarkCallout)
    .use(remarkMark)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeUnwrapParagraphsAroundMedia)
    .use(rehypeResolveHtmlUrls, { filePath: '', sitePrefix, customDomain })
    .use(rehypeHtmlEnhancements, { sitePrefix })
    .use(rehypeSlug)
    .use(rehypeKatex, { output: 'htmlAndMathml' })
    .use(rehypePrismPlus, { ignoreMissing: true })
    .use(rehypeStringify)
    .process(content);

  return String(result);
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
      style: `position: absolute; top: 0; left: 0; width: ${width}px; height: ${height}px; pointer-events: none;`,
      viewBox: `0 0 ${width} ${height}`,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    svgChildren,
  );

  return h(
    'div',
    {
      className: 'canvas-container',
      style: `position: relative; width: 100%; height: ${height}px;overflow:scroll;`,
    },
    [...nodeElements, svgOverlay],
  );
}
