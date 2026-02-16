import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { ImageDimensionsMap } from './image-dimensions';

interface Options {
  dimensions: ImageDimensionsMap;
}

/**
 * Rehype plugin that injects width/height from a pre-built dimensions map
 * onto <img> elements. Existing (author-explicit) dimensions are preserved.
 */
const rehypeInjectImageDimensions: Plugin<[Options]> = (options) => {
  const { dimensions } = options;

  return (tree) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'img') return;

      const src = node.properties?.src;
      if (!src || typeof src !== 'string') return;

      // Skip if dimensions already set (author-explicit takes priority)
      if (node.properties.width && node.properties.height) return;

      const dims = dimensions[src];
      if (!dims) return;

      node.properties.width = String(dims.width);
      node.properties.height = String(dims.height);
    });
  };
};

export default rehypeInjectImageDimensions;
