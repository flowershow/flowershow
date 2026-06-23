import { visit } from 'unist-util-visit';
import { resolveContentLink, resolveToAbsolutePath } from './resolve-link';

export interface Options {
  filePath: string;
  siteHostname: string;
  permalinks?: Record<string, string>;
}

const dimensionOnlyPattern = /^\s*(\d+)(?:x(\d+))?\s*$/;

function RemarkCommonMarkLink({ filePath, siteHostname, permalinks }: Options) {
  return (tree: any) => {
    visit(tree, 'link', (node) => {
      if (typeof node.url !== 'string') return;

      node.url = resolveContentLink({
        target: node.url,
        originFilePath: filePath,
        siteHostname,
        permalinks,
      });
    });

    visit(tree, 'image', (node: any) => {
      if (typeof node.url !== 'string') return;

      node.data ??= {};
      node.data.hProperties ??= {};

      const isExternal =
        node.url.startsWith('http') || node.url.startsWith('//');

      if (!isExternal)
        node.data.hProperties['data-fs-resolved-file-path'] =
          resolveToAbsolutePath(node.url, filePath);

      node.url = resolveContentLink({
        target: node.url,
        originFilePath: filePath,
        siteHostname,
      });

      // Mark commonmark images as "internal" so FsImage applies next/image optimization.
      if (!node.data.hProperties.className?.includes('internal')) {
        node.data.hProperties.className = node.data.hProperties.className
          ? `${node.data.hProperties.className} internal`
          : 'internal';
      }

      // Obsidian-style image resizing: ![250x100](url) or ![250](url)
      if (node.alt) {
        const match = node.alt.match(dimensionOnlyPattern);
        if (match) {
          node.data.hProperties['data-fs-width'] = match[1];
          if (match[2]) node.data.hProperties['data-fs-height'] = match[2];
          node.alt = '';
        }
      }
    });
  };
}

export default RemarkCommonMarkLink;
