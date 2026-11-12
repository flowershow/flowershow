import { isDir, isFile, type FileNode, type Node } from './build-site-tree';

type PageLink = { url: string; title: string };

/**
 * Pages in the order the sidebar shows them: depth-first, with a folder's own
 * page (the child file at the folder's URL) first in that folder.
 */
function flattenPages<M>(nodes: Array<Node<M>>): Array<FileNode<M>> {
  return nodes.flatMap((n): Array<FileNode<M>> => {
    if (isFile(n)) return [n];
    const own = n.children.filter((c) => isFile(c) && c.urlPath === n.urlPath);
    const rest = n.children.filter(
      (c) => !(isFile(c) && c.urlPath === n.urlPath),
    );
    return flattenPages([...own, ...rest]);
  });
}

export function adjacentPages(
  tree: Node[],
  pagePath: string,
): { previous: PageLink | null; next: PageLink | null } {
  const pages = flattenPages(tree);
  const i = pages.findIndex((p) => p.path === pagePath);
  if (i === -1) return { previous: null, next: null };
  const link = (p: FileNode | undefined): PageLink | null =>
    p ? { url: p.urlPath, title: p.label } : null;
  return { previous: link(pages[i - 1]), next: link(pages[i + 1]) };
}
