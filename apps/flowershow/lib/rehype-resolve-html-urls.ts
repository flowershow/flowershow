import { visit } from 'unist-util-visit';
import { resolveFilePathToUrlPath } from './resolve-link';

export interface Options {
  /** path to file where the link was used */
  filePath: string;
  /** site prefix (@username/sitename or none if on custom domain) */
  sitePrefix: string;
  customDomain?: string;
}

/**
 * A rehype plugin that targets regular HTML elements in markdown
 * and prefixes their src/href URLs.
 *
 * Unlike rehype-resolve-explicit-jsx-urls which targets MDX JSX elements,
 * this plugin works with standard HTML elements in regular markdown.
 */
export default function rehypeResolveHtmlUrls(options: Options) {
  const { filePath, sitePrefix, customDomain } = options;

  return (tree) => {
    visit(tree, 'element', (node: any) => {
      if (node.properties) {
        // Handle src attribute (for img, video, audio, iframe, etc.)
        if (node.properties.src && typeof node.properties.src === 'string') {
          node.properties.src = resolveFilePathToUrlPath({
            target: node.properties.src,
            originFilePath: filePath,
            sitePrefix,
            domain: customDomain,
          });
        }

        // Handle href attribute (for a, link, etc.)
        // Skip hrefs already resolved by upstream remark plugins (remarkWikiLink,
        // RemarkCommonMarkLink). On non-custom domains they start with sitePrefix;
        // on custom domains (sitePrefix="") they are absolute paths starting with "/".
        if (node.properties.href && typeof node.properties.href === 'string') {
          const href = node.properties.href;
          const alreadyResolved = sitePrefix
            ? href.startsWith(sitePrefix)
            : href.startsWith('/');
          if (!alreadyResolved) {
            node.properties.href = resolveFilePathToUrlPath({
              target: href,
              originFilePath: filePath,
              sitePrefix,
              domain: customDomain,
            });
          }
        }
      }
    });
  };
}
