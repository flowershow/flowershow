import { visit } from "unist-util-visit";
import { resolveLinkToUrl } from "./resolve-link";

export interface Options {
  /** path to file where the link was used */
  filePath: string;
  /** site prefix (@username/sitename or none if on custom domain) */
  sitePrefix: string;
  customDomain?: string;
}

function remarkCommonMarkLinkResolver({
  filePath,
  sitePrefix,
  customDomain,
}: Options) {
  return (tree: any) => {
    visit(tree, "link", (node) => {
      if (typeof node.url !== "string") return;
      node.url = resolveLinkToUrl({
        target: node.url,
        originFilePath: filePath,
        prefix: sitePrefix,
      });
    });
    visit(tree, "image", (node) => {
      if (typeof node.url !== "string") return;
      node.url = resolveLinkToUrl({
        target: node.url,
        originFilePath: filePath,
        prefix: sitePrefix,
        isSrcLink: true,
        domain: customDomain,
      });
    });
  };
}

export default remarkCommonMarkLinkResolver;
