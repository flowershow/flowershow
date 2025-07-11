import { visit } from "unist-util-visit";
import { resolveLink } from "./resolve-link";

function remarkCommonMarkLinkResolver({
  filePath,
  siteSubpath,
}: {
  filePath: string;
  siteSubpath: string;
}) {
  return (tree: any) => {
    visit(tree, "link", (node) => {
      if (typeof node.url !== "string") return;
      node.url = resolveLink({
        link: node.url,
        filePath,
        prefixPath: siteSubpath,
      });
    });
  };
}

export default remarkCommonMarkLinkResolver;
