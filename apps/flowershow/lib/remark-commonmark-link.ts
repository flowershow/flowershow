import { matchLinkTarget } from '@flowershow/core';
import { visit } from 'unist-util-visit';
import { resolveContentLink, resolveToAbsolutePath } from './resolve-link';

export interface Options {
  filePath: string;
  siteHostname: string;
  files?: string[];
  permalinks?: Record<string, string>;
}

const dimensionOnlyPattern = /^\s*(\d+)(?:x(\d+))?\s*$/;

function RemarkCommonMarkLink({
  filePath,
  siteHostname,
  files = [],
  permalinks,
}: Options) {
  const wrappedFiles = files.map((f) => ({ path: f }));

  return (tree: any) => {
    visit(tree, 'link', (node) => {
      if (typeof node.url !== 'string') return;
      if (node.url.startsWith('mailto:')) return;
      if (node.url.startsWith('http')) return;

      const contentPath = resolveToAbsolutePath(node.url, filePath);
      const matchingFile = contentPath
        ? matchLinkTarget(contentPath, wrappedFiles, {
            format: 'exact',
            caseInsensitive: false,
          })?.path
        : undefined;

      if (matchingFile) {
        if (!node.data) node.data = {};
        if (!node.data.hProperties) node.data.hProperties = {};
        node.data.hProperties['data-fs-resolved-file-path'] = matchingFile;
      }

      node.url = resolveContentLink({
        target: node.url,
        originFilePath: filePath,
        siteHostname,
        permalinks,
      });
    });

    visit(tree, 'image', (node: any) => {
      if (typeof node.url !== 'string') return;

      const contentPath = resolveToAbsolutePath(node.url, filePath);
      const matchingFile = contentPath
        ? matchLinkTarget(contentPath, wrappedFiles, {
            format: 'exact',
            caseInsensitive: false,
          })?.path
        : undefined;

      node.url = resolveContentLink({
        target: node.url,
        originFilePath: filePath,
        siteHostname,
      });

      if (!node.data) node.data = {};
      if (!node.data.hProperties) node.data.hProperties = {};

      if (matchingFile) {
        node.data.hProperties['data-fs-resolved-file-path'] = matchingFile;
      }

      // Mark common mark images as "internal" so FsImage applies
      // next/image optimization (same class remark-wiki-link uses).
      const existing = node.data.hProperties.className || '';
      if (!existing.includes('internal')) {
        node.data.hProperties.className = existing
          ? `${existing} internal`
          : 'internal';
      }

      // Obsidian-style image resizing: ![250x100](url) or ![250](url)
      // Uses data-fs-* attributes, same as remark-wiki-link
      if (node.alt) {
        const match = node.alt.match(dimensionOnlyPattern);
        if (match) {
          node.data.hProperties['data-fs-width'] = match[1];
          if (match[2]) {
            node.data.hProperties['data-fs-height'] = match[2];
          }
          node.alt = '';
        }
      }
    });
  };
}

export default RemarkCommonMarkLink;
