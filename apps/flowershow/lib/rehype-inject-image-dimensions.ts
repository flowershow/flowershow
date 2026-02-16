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

      const resolvedFilePath = node.properties?.dataFsResolvedFilePath;
      if (!resolvedFilePath || typeof resolvedFilePath !== 'string') return;

      const dims = dimensions[resolvedFilePath];
      if (!dims) return;

      // Use data attributes so FsImage can distinguish DB-intrinsic geometry
      // (used for aspect ratio in responsive rendering) from author-explicit
      // dimensions (used for fixed pixel sizing).
      node.properties['data-fs-intrinsic-width'] = String(dims.width);
      node.properties['data-fs-intrinsic-height'] = String(dims.height);
    });
  };
};

export default rehypeInjectImageDimensions;
