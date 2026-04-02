/**
 * Rehype plugin to render inline JSON Canvas embeds in markdown.
 *
 * When markdown contains an image embed with a .canvas extension
 * (e.g. `![](my-diagram.canvas)` or via wiki-link `![[my-diagram.canvas]]`),
 * this plugin replaces it with an inline HTML rendering of the canvas.
 *
 * Adapted from rehype-jsoncanvas (MIT license).
 */

import type { Element, Root } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { h } from 'hastscript';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import {
  type CanvasRenderOptions,
  type RenderMarkdownOptions,
  enrichCanvasNodes,
  parseCanvasData,
  renderCanvas,
  renderMarkdownToHtml,
} from './canvas-renderer';

export interface RehypeJsonCanvasOptions extends CanvasRenderOptions {
  /**
   * Map of canvas file paths to their JSON content strings.
   * Keys should match the src attribute values found in img tags.
   */
  canvasFiles?: Record<string, string>;
  /** Pre-fetched file contents for .md files referenced by canvas nodes. */
  canvasNodeFiles?: Record<string, string>;
  /** Resolve a file path referenced by a canvas node to its content string. */
  resolveFile?: (path: string) => Promise<string | null>;
  /** List of file paths for wiki-link resolution. */
  files?: string[];
  /** The serving hostname for link resolution (custom domain or subdomain.flowershow.site). */
  siteHostname: string;
  /** Permalinks mapping for wiki-link resolution. */
  permalinks?: Record<string, string>;
}

const rehypeJsonCanvas: Plugin<
  [(RehypeJsonCanvasOptions | undefined)?],
  Root
> = (config) => {
  return async (tree) => {
    const canvasFiles = config?.canvasFiles ?? {};

    // Collect all canvas embed nodes for async processing
    const matches: { node: Element; canvasContent: string }[] = [];

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;

      const src = node.properties?.src as string | undefined;
      if (!src?.endsWith('.canvas')) return;

      // Try exact match, then match by basename
      const basename = src.split('/').pop() ?? '';
      const canvasContent =
        canvasFiles[src] ??
        Object.entries(canvasFiles).find(
          ([key]) => key === basename || key.endsWith(`/${basename}`),
        )?.[1];

      if (!canvasContent) {
        node.tagName = 'div';
        node.properties = { className: ['canvas-embed', 'canvas-missing'] };
        node.children = [h('p', `Canvas file not found: ${src}`)];
        return;
      }

      matches.push({ node, canvasContent });
    });

    // Process all canvas embeds with enrichment (async)
    await Promise.all(
      matches.map(async ({ node, canvasContent }) => {
        try {
          const canvas = parseCanvasData(canvasContent);
          const mdOptions: RenderMarkdownOptions = {
            files: config?.files,
            siteHostname: config?.siteHostname ?? '',
            permalinks: config?.permalinks,
          };
          const enrichedNodes = await enrichCanvasNodes(canvas.nodes, {
            renderMarkdown: (text) => renderMarkdownToHtml(text, mdOptions),
            resolveFile: config?.resolveFile,
            canvasNodeFiles: config?.canvasNodeFiles,
          });
          const rendered = renderCanvas(
            { nodes: enrichedNodes, edges: canvas.edges },
            config,
          );

          // Convert { type: 'raw' } nodes to proper HAST elements so
          // downstream compilers (e.g. toJsxRuntime) can handle them.
          resolveRawNodes(rendered);

          node.tagName = 'div';
          node.properties = { className: ['canvas-embed'] };
          node.children = [rendered];
        } catch {
          const src = node.properties?.src as string | undefined;
          node.tagName = 'div';
          node.properties = { className: ['canvas-embed', 'canvas-error'] };
          node.children = [h('p', `Error rendering canvas: ${src}`)];
        }
      }),
    );
  };
};

/**
 * Walk a HAST tree and replace { type: 'raw', value } nodes with parsed HAST
 * elements, so compilers like toJsxRuntime that don't support raw nodes can
 * handle the enriched markdown content.
 */
function resolveRawNodes(node: any) {
  if (!node.children) return;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'raw' && typeof child.value === 'string') {
      const parsed = fromHtml(child.value, { fragment: true });
      node.children.splice(i, 1, ...parsed.children);
      // Adjust index to account for potentially multiple inserted children
      i += parsed.children.length - 1;
    } else {
      resolveRawNodes(child);
    }
  }
}

export default rehypeJsonCanvas;
