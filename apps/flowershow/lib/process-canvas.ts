/**
 * Process a JSON Canvas file for standalone page rendering.
 */

import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';
import {
  type CanvasRenderOptions,
  type RenderMarkdownOptions,
  enrichCanvasNodes,
  parseCanvasData,
  renderCanvas,
  renderMarkdownToHtml,
} from './canvas-renderer';

export interface ProcessCanvasOptions extends Partial<CanvasRenderOptions> {
  /** Resolve a file path referenced by a canvas node to its content string. */
  resolveFile?: (path: string) => Promise<string | null>;
  /** Pre-fetched file contents for .md files referenced by canvas nodes. */
  canvasNodeFiles?: Record<string, string>;
  /** Prefix to prepend to image/link paths (e.g. "/@user/project"). */
  sitePrefix?: string;
  /** List of file paths for wiki-link resolution. */
  files?: string[];
  /** Custom domain for link resolution. */
  customDomain?: string;
  /** Permalinks mapping for wiki-link resolution. */
  permalinks?: Record<string, string>;
}

/**
 * Process canvas for standalone page rendering.
 *
 * 1. Parses canvas JSON
 * 2. Enriches nodes (markdown rendering for text nodes, file resolution for .md files)
 * 3. Renders to HAST via the shared renderCanvas()
 * 4. Converts HAST to React JSX
 */
export async function processCanvas(
  content: string,
  config?: ProcessCanvasOptions,
): Promise<React.JSX.Element> {
  const canvas = parseCanvasData(content);

  // Enrich: process markdown in text nodes, resolve .md file nodes
  const mdOptions: RenderMarkdownOptions = {
    files: config?.files,
    sitePrefix: config?.sitePrefix,
    customDomain: config?.customDomain,
    permalinks: config?.permalinks,
  };
  const enrichedNodes = await enrichCanvasNodes(canvas.nodes, {
    renderMarkdown: (text) => renderMarkdownToHtml(text, mdOptions),
    resolveFile: config?.resolveFile,
    canvasNodeFiles: config?.canvasNodeFiles,
  });

  // Render to HAST using the shared renderer
  const hast = renderCanvas(
    { nodes: enrichedNodes, edges: canvas.edges },
    config,
  );

  // Wrap in canvas-page div (matches previous output structure)
  const wrappedHast: any = {
    type: 'element',
    tagName: 'div',
    properties: { className: ['canvas-page'] },
    children: [hast],
  };

  // Resolve image/link URLs so they point to served paths (the markdown
  // pipeline does this via rehypeResolveHtmlUrls, but processCanvas
  // bypasses that pipeline).
  if (config?.sitePrefix) {
    resolveUrls(wrappedHast, config.sitePrefix);
  }

  // Pre-process: convert raw nodes to elements with dangerouslySetInnerHTML
  // since hast-util-to-jsx-runtime doesn't handle { type: 'raw' } directly.
  preprocessRawNodes(wrappedHast);

  return toJsxRuntime(wrappedHast, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
  }) as React.JSX.Element;
}

/**
 * Walk the HAST tree and resolve src/href attributes on HTML elements,
 * so images and links point to the correct serving URLs.
 */
function resolveUrls(node: any, sitePrefix: string) {
  if (node.type === 'element' && node.properties) {
    if (
      typeof node.properties.src === 'string' &&
      node.properties.src.startsWith('/')
    ) {
      node.properties.src = sitePrefix + node.properties.src;
    }
    if (
      typeof node.properties.href === 'string' &&
      node.properties.href.startsWith('/')
    ) {
      node.properties.href = sitePrefix + node.properties.href;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      resolveUrls(child, sitePrefix);
    }
  }
}

/**
 * Walk the HAST tree and replace { type: 'raw', value } children with
 * element nodes using dangerouslySetInnerHTML, so toJsxRuntime can handle them.
 */
function preprocessRawNodes(node: any) {
  if (!node.children) return;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'raw') {
      node.children[i] = {
        type: 'element',
        tagName: 'span',
        properties: { dangerouslySetInnerHTML: { __html: child.value } },
        children: [],
      };
    } else {
      preprocessRawNodes(child);
    }
  }
}
