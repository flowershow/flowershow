import * as path from 'path';
import { visit } from 'unist-util-visit';
import { resolveFilePathToUrlPath } from './resolve-link';

export interface Options {
  filePath: string;
  sitePrefix: string;
  customDomain?: string;
  files?: string[];
  permalinks?: Record<string, string>;
}

const dimensionOnlyPattern = /^\s*(\d+)(?:x(\d+))?\s*$/;

/**
 * Resolve a commonmark relative path to an absolute content path.
 * Replicates the resolution logic from resolveFilePathToUrlPath
 * so we can match against the files list before URL conversion.
 */
function resolveToContentPath(target: string, originFilePath: string): string {
  // Decode %20 spaces (commonmark encoding)
  const decoded = target
    .split('/')
    .map((p) => p.replaceAll('%20', ' '))
    .join('/');

  // Strip heading fragment
  const [, pathPart = ''] = decoded.match(/^(.*?)(?:#.*)?$/u) || [];
  if (!pathPart) return '';

  // Normalize origin to have leading slash
  const origin = originFilePath.startsWith('/')
    ? originFilePath
    : `/${originFilePath}`;

  // Resolve relative to absolute
  if (pathPart.startsWith('/')) return pathPart;
  return path.resolve(path.dirname(origin), pathPart);
}

/**
 * Find a file in the files list matching the resolved content path.
 * For extension-less paths (markdown links without .md), also tries .md/.mdx.
 */
function findFile(resolvedPath: string, files: string[]): string | undefined {
  const exact = files.find((f) => f === resolvedPath);
  if (exact) return exact;

  // Extension-less markdown links: try .md, .mdx
  if (!path.extname(resolvedPath)) {
    return files.find(
      (f) => f === resolvedPath + '.md' || f === resolvedPath + '.mdx',
    );
  }
  return undefined;
}

function RemarkCommonMarkLink({
  filePath,
  sitePrefix,
  customDomain,
  files = [],
  permalinks,
}: Options) {
  return (tree: any) => {
    visit(tree, 'link', (node) => {
      if (typeof node.url !== 'string') return;
      if (node.url.startsWith('mailto:')) return;
      if (node.url.startsWith('http')) return;

      const contentPath = resolveToContentPath(node.url, filePath);
      const matchingFile = contentPath
        ? findFile(contentPath, files)
        : undefined;

      if (matchingFile) {
        if (!node.data) node.data = {};
        if (!node.data.hProperties) node.data.hProperties = {};
        node.data.hProperties['data-fs-resolved-file-path'] = matchingFile;
      }

      node.url = resolveFilePathToUrlPath({
        target: node.url,
        originFilePath: filePath,
        sitePrefix,
        domain: customDomain,
        commonMarkSpaceEncoded: true,
        permalinks,
      });
    });

    visit(tree, 'image', (node: any) => {
      if (typeof node.url !== 'string') return;

      const contentPath = resolveToContentPath(node.url, filePath);
      const matchingFile = contentPath
        ? findFile(contentPath, files)
        : undefined;

      node.url = resolveFilePathToUrlPath({
        target: node.url,
        originFilePath: filePath,
        sitePrefix,
        domain: customDomain,
        commonMarkSpaceEncoded: true,
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
