import type { Blob } from "@prisma/client";
import type { TreeViewItem } from "@/components/public/site-tree";
import { customEncodeUrl } from "./url-encoder";

export type SiteMap = TreeViewItem[];

// For use with markdown files stored in site's blobs
export const buildSiteMapFromSiteBlobs = (
  blobs: Blob[],
  prefix: string = "",
): SiteMap => {
  // Function to insert an item into the nested tree.
  const insertIntoNestedTree = (
    parts: string[],
    item: Blob,
    tree: SiteMap,
    parentPath: string,
  ) => {
    const currentPart = parts.shift()!;
    const path = parentPath ? `${parentPath}/${currentPart}` : currentPart;

    let node = tree.find((n) => n.label === currentPart);
    const urlPath = customEncodeUrl(path);

    if (!node) {
      node = {
        id: path,
        label: !currentPart.endsWith(".md")
          ? currentPart
          : (item.metadata as any)?.title || currentPart.replace(/\.md$/, ""),
        path: `${prefix}/${urlPath}`.replace(/(\/index|\/README)?\.md$/, ""),
      };
      tree.push(node);
    }

    if (parts.length > 0) {
      if (!node.children) {
        node.children = [];
      }
      insertIntoNestedTree(parts, item, node.children, path);
    }

    tree.sort((a, b) => {
      // Check if both have children, or none have.
      if ((a.children && b.children) || (!a.children && !b.children)) {
        // If both are the same in terms of having children, sort alphabetically.
        return a.label.localeCompare(b.label);
      } else if (a.children && !b.children) {
        // If a has children but b does not, a should come first.
        return -1;
      } else {
        // If b has children but a does not, b should come first.
        return 1;
      }
    });
  };

  const siteMap: SiteMap = [];

  blobs.forEach((item) => {
    const parts = item.path.split("/");
    insertIntoNestedTree(parts, item, siteMap, "");
  });

  return siteMap;
};
