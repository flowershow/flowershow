import { visit } from 'unist-util-visit';
import { resolveFilePathToUrlPath } from './resolve-link';

export interface Options {
  /** path to file where the link was used */
  filePath: string;
  siteHostname: string;
}

/**
 * A rehype plugin that targets regular HTML elements in markdown
 * and prefixes their src/href URLs.
 *
 * Unlike rehype-resolve-explicit-jsx-urls which targets MDX JSX elements,
 * this plugin works with standard HTML elements in regular markdown.
 */
export default function rehypeResolveHtmlUrls(options: Options) {
  const { filePath, siteHostname } = options;

  return (tree) => {
    visit(tree, 'element', (node: any) => {
      if (node.properties) {
        // Handle src attribute (for img, video, audio, iframe, etc.)
        if (node.properties.src && typeof node.properties.src === 'string') {
          node.properties.src = resolveFilePathToUrlPath({
            target: node.properties.src,
            originFilePath: filePath,
            siteHostname,
          });
        }

        // Handle href attribute (for a, link, etc.)
        // Skip hrefs already resolved by upstream remark plugins (remarkWikiLink,
        // RemarkCommonMarkLink). Resolved hrefs are absolute paths starting with "/".
        if (node.properties.href && typeof node.properties.href === 'string') {
          const href = node.properties.href;
          const alreadyResolved = href.startsWith('/');
          if (!alreadyResolved) {
            node.properties.href = resolveFilePathToUrlPath({
              target: href,
              originFilePath: filePath,
              siteHostname,
            });
          }
        }
      }
    });
  };
}
