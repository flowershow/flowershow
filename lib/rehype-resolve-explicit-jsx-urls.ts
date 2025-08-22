import { visit } from "unist-util-visit";
import { resolveLinkToUrl } from "./resolve-link";

export interface Options {
  /** path to file where the link was used */
  filePath: string;
  /** site prefix (@username/sitename or none if on custom domain) */
  sitePrefix: string;
  customDomain?: string;
}

/**
 * A rehype plugin that targets explicit MDX JSX elements
 * and prefixes their src/href URLs.
 */
export default function rehypeResolveExplicitJsxUrls(options: Options) {
  const { filePath, sitePrefix, customDomain } = options;

  return (tree) => {
    visit(tree, "mdxJsxFlowElement", (node) => {
      if (node.data?._mdxExplicitJsx && node.attributes) {
        (node.attributes as Array<Record<string, any>>).forEach((a) => {
          if (a.name === "src") {
            a.value = resolveLinkToUrl({
              target: a.value,
              originFilePath: filePath,
              prefix: sitePrefix,
              isSrcLink: true,
              domain: customDomain,
            });
          } else if (a.name === "href") {
            a.value = resolveLinkToUrl({
              target: a.value,
              originFilePath: filePath,
              prefix: sitePrefix,
            });
          }
        });

        // Clear the flag so downstream plugins treat it like a normal element
        // delete node.data._mdxExplicitJsx;
      }
    });
  };
}
