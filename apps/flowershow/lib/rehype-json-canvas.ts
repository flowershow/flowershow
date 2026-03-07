/**
 * Rehype plugin to render inline JSON Canvas embeds in markdown.
 *
 * When markdown contains an image embed with a .canvas extension
 * (e.g. `![](my-diagram.canvas)` or via wiki-link `![[my-diagram.canvas]]`),
 * this plugin replaces it with an inline SVG rendering of the canvas.
 *
 * Adapted from rehype-jsoncanvas (MIT license).
 * Key difference: canvas content is passed via options (pre-fetched from blob
 * storage) instead of reading from the filesystem.
 */

import JSONCanvas from '@trbn/jsoncanvas';
import type { Element, Root } from 'hast';
import { h } from 'hastscript';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { type CanvasRenderOptions, renderCanvas } from './canvas-renderer';

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

      // Look up the canvas content from the pre-fetched map
      const canvasContent = canvasFiles[src];
      if (!canvasContent) {
        // Replace with a placeholder if canvas content wasn't provided
        node.tagName = 'div';
        node.properties = { className: ['canvas-embed', 'canvas-missing'] };
        node.children = [
          h('p', `Canvas file not found: ${src}`),
        ];
        return;
      }

      try {
        const jsc = JSONCanvas.fromString(canvasContent);
        const svg = renderCanvas(jsc, config);

        node.tagName = 'div';
        node.properties = { className: ['canvas-embed'] };
        node.children = [svg];
      } catch {
        node.tagName = 'div';
        node.properties = { className: ['canvas-embed', 'canvas-error'] };
        node.children = [
          h('p', `Error rendering canvas: ${src}`),
        ];
      }
    });
  };
};

export default rehypeJsonCanvas;
