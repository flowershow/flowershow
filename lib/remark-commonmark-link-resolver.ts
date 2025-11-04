import { visit } from "unist-util-visit";
import { resolveLinkToUrl } from "./resolve-link";

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

      const ext = node.url.split(".").pop();
      const isMarkdown = ext === "md" || ext === "mdx" || !ext;

      if (isMarkdown) {
        const resolvedUrl = resolveLinkToUrl({
          target: node.url,
          originFilePath: filePath,
          prefix: sitePrefix,
        });

        node.url = resolvedUrl;
      } else {
        node.url = resolveLinkToUrl({
          target: node.url,
          originFilePath: filePath,
          prefix: sitePrefix,
          isSrcLink: true,
          domain: customDomain,
        });
      }
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
