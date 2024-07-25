import { PageMetadata } from "@/server/api/types";
import type { GitHubAPIRepoTree, GitHubAPIRepoTreeItem } from "./github";
import type { TreeViewItem } from "@/components/tree-view";

export type NestedRepoTree = TreeViewItem[];

// For use with markdown files metadata stored in site's `files` field
export const buildNestedTreeFromFilesMap = (
  flatTree: PageMetadata[],
  prefix: string = "",
): NestedRepoTree => {
  // Function to insert an item into the nested tree.
  const insertIntoNestedTree = (
    parts: string[],
    item: PageMetadata,
    tree: NestedRepoTree,
    parentPath: string,
  ) => {
    const currentPart = parts.shift()!;
    const path = parentPath ? `${parentPath}/${currentPart}` : currentPart;

    let node = tree.find((n) => n.label === currentPart);
    if (!node) {
      node = {
        id: path,
        label: !currentPart.endsWith(".md")
          ? currentPart
          : item.title || currentPart.replace(/\.md$/, ""),
        path: `${prefix}/${item._url.replace(/%20/g, "+")}`,
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

  // The initial nested tree.
  const nestedTree: NestedRepoTree = [];

  flatTree.forEach((item) => {
    const parts = item._path.split("/");
    insertIntoNestedTree(parts, item, nestedTree, "");
  });

  return nestedTree;
};

// For use with GitHub API tree
export const buildNestedTree = (
  flatTree: GitHubAPIRepoTree,
  prefix: string = "",
): NestedRepoTree => {
  // Function to insert an item into the nested tree.
  const insertIntoNestedTree = (
    parts: string[],
    item: GitHubAPIRepoTreeItem,
    tree: NestedRepoTree,
    parentPath: string,
  ) => {
    const currentPart = parts.shift()!;
    const path = parentPath ? `${parentPath}/${currentPart}` : currentPart;

    let node = tree.find((n) => n.label === currentPart);
    if (!node) {
      node = {
        id: path,
        label: currentPart.replace(/\.md$/, ""),
        path: `${prefix}/${path}`.replace(/(\/index|\/README)?\.md$/, ""),
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

  // The initial nested tree.
  const nestedTree: NestedRepoTree = [];

  flatTree.tree.forEach((item) => {
    if (item.type !== "blob") {
      return;
    }

    // if it's not markdown file, skip
    if (!item.path.endsWith(".md")) {
      return;
    }

    const parts = item.path.split("/");
    insertIntoNestedTree(parts, item, nestedTree, "");
  });

  return nestedTree;
};
