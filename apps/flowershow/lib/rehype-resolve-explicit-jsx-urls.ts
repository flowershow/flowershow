import { visit } from 'unist-util-visit';
import { resolveFilePathToUrlPath } from './resolve-link';

export interface Options {
  /** path to file where the link was used */
  filePath: string;
  siteHostname?: string;
}

/**
 * A rehype plugin that targets explicit MDX JSX elements
 * and prefixes their src/href URLs.
 */
export default function rehypeResolveExplicitJsxUrls(options: Options) {
  const { filePath, siteHostname } = options;

  return (tree) => {
    visit(tree, 'mdxJsxFlowElement', (node) => {
      if (node.data?._mdxExplicitJsx && node.attributes) {
        (node.attributes as Array<Record<string, any>>).forEach((a) => {
          if (a.name === 'src' || a.name === 'href') {
            a.value = resolveFilePathToUrlPath({
              target: a.value,
              originFilePath: filePath,
              siteHostname,
            });
          }
        });

        // Clear the flag so downstream plugins treat it like a normal element
        // delete node.data._mdxExplicitJsx;
      }
    });
  };
}
