import { visit } from "unist-util-visit";
import { resolveLink } from "./resolve-link";

export interface Options {
  /** path to file where the link was used */
  filePath: string;
  /** site prefix (@username/sitename or none if on custom domain) */
  siteSubpath: string;
}

/**
 * A rehype plugin that targets explicit MDX JSX elements
 * and prefixes their src/href URLs.
 */
export default function rehypeResolveExplicitJsxUrls(options: Options) {
  const { filePath, siteSubpath } = options;

  return (tree) => {
    visit(tree, "mdxJsxFlowElement", (node) => {
      if (node.data?._mdxExplicitJsx && node.attributes) {
        (node.attributes as Array<Record<string, any>>).forEach((a) => {
          if (a.name === "src") {
            // TODO create a single lib for this kind of stuff (currently we have patches like this in many different places)
            a.value = resolveLink({
              link: a.value,
              filePath,
              prefixPath: siteSubpath ? siteSubpath + "/_r/-" : "/_r/-",
            });
          } else if (a.name === "href") {
            // TODO create a single lib for this kind of stuff (currently we have patches like this in many different places)
            a.value = resolveLink({
              link: a.value,
              filePath,
              prefixPath: siteSubpath,
            });
          }
        });

        // Optionally clear the flag so downstream plugins
        // treat it like a normal element
        // delete node.data._mdxExplicitJsx;
      }
    });
  };
}
