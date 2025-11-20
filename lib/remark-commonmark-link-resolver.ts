import { visit } from "unist-util-visit";
import { resolvePathToUrl } from "./resolve-link";

export interface Options {
  filePath: string;
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

      if (node.url.startsWith("mailto:")) return;
      if (node.url.startsWith("http")) return;

      node.url = resolvePathToUrl({
        target: node.url,
        originFilePath: filePath,
        sitePrefix: sitePrefix,
        domain: customDomain,
        commonMarkSpaceEncoded: true,
      });
    });
    visit(tree, "image", (node) => {
      if (typeof node.url !== "string") return;
      node.url = resolvePathToUrl({
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
