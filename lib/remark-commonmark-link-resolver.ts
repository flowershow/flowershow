import { visit } from 'unist-util-visit';
import { resolveFilePathToUrlPath } from './resolve-link';

export interface Options {
  filePath: string;
  sitePrefix: string;
  customDomain?: string;
  permalinks?: Record<string, string>;
}

function remarkCommonMarkLinkResolver({
  filePath,
  sitePrefix,
  customDomain,
  permalinks,
}: Options) {
  return (tree: any) => {
    visit(tree, 'link', (node) => {
      if (typeof node.url !== 'string') return;

      if (node.url.startsWith('mailto:')) return;
      if (node.url.startsWith('http')) return;

      node.url = resolveFilePathToUrlPath({
        target: node.url,
        originFilePath: filePath,
        sitePrefix: sitePrefix,
        domain: customDomain,
        commonMarkSpaceEncoded: true,
        permalinks,
      });
    });
    visit(tree, 'image', (node) => {
      if (typeof node.url !== 'string') return;
      node.url = resolveFilePathToUrlPath({
        target: node.url,
        originFilePath: filePath,
        sitePrefix: sitePrefix,
        domain: customDomain,
        commonMarkSpaceEncoded: true,
      });
    });
  };
}

export default remarkCommonMarkLinkResolver;
