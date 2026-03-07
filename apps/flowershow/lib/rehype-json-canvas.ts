/**
 * Rehype plugin to render inline JSON Canvas embeds in markdown.
 *
 * When markdown contains an image embed with a .canvas extension
 * (e.g. `![](my-diagram.canvas)` or via wiki-link `![[my-diagram.canvas]]`),
 * this plugin replaces it with an inline HTML rendering of the canvas.
 *
 * Inline embeds render text nodes as plain text (no markdown processing).
 * For standalone canvas pages with rich markdown in nodes, see process-canvas.ts.
 *
 * Adapted from rehype-jsoncanvas (MIT license).
 */

import type { Element, Root } from 'hast';
import { h } from 'hastscript';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import {
  type CanvasRenderOptions,
  parseCanvasData,
  renderCanvas,
} from './canvas-renderer';

export interface RehypeJsonCanvasOptions extends CanvasRenderOptions {
  /**
   * Map of canvas file paths to their JSON content strings.
   * Keys should match the src attribute values found in img tags.
   */
  canvasFiles?: Record<string, string>;
}

const rehypeJsonCanvas: Plugin<
  [(RehypeJsonCanvasOptions | undefined)?],
  Root
> = (config) => {
  return (tree) => {
    const canvasFiles = config?.canvasFiles ?? {};

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

      try {
        const canvas = parseCanvasData(canvasContent);
        const rendered = renderCanvas(canvas, config);

        node.tagName = 'div';
        node.properties = { className: ['canvas-embed'] };
        node.children = [rendered];
      } catch {
        node.tagName = 'div';
        node.properties = { className: ['canvas-embed', 'canvas-error'] };
        node.children = [h('p', `Error rendering canvas: ${src}`)];
      }
    });
  };
};

export default rehypeJsonCanvas;
