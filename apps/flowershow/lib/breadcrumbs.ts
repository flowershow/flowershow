import { isDir, isFile, type Node } from '@/lib/build-site-tree';

export interface Breadcrumb {
  label: string;
  /** Set when the crumb has a page to link to, null otherwise */
  href: string | null;
}

/** Check if a directory has a child file served at the same URL (index/README) */
function dirHasIndexPage(node: Node): boolean {
  return (
    isDir(node) &&
    node.children.some((c) => isFile(c) && c.urlPath === node.urlPath)
  );
}

/** Walk the tree to find the breadcrumb trail to the first node matching `isTarget` */
export function findBreadcrumbs(
  items: Node[],
  isTarget: (node: Node) => boolean,
): Breadcrumb[] {
  for (const item of items) {
    if (isTarget(item)) {
      return [
        {
          label: item.label,
          href: isFile(item) || dirHasIndexPage(item) ? item.urlPath : null,
        },
      ];
    }
    if (isDir(item)) {
      const found = findBreadcrumbs(item.children, isTarget);
      if (found.length > 0) {
        return [
          {
            label: item.label,
            href: dirHasIndexPage(item) ? item.urlPath : null,
          },
          ...found,
        ];
      }
    }
  }
  return [];
}

/**
 * Breadcrumb trail shown in the page header. The last crumb is the current
 * page (never linked). A frontmatter `section` replaces the folder-derived
 * ancestors, so flat sites can still express grouping. Returns [] when there
 * is nothing above the current page to show.
 */
export function pageHeaderBreadcrumbs({
  tree,
  pagePath,
  title,
  section,
}: {
  tree: Node[];
  /** Repo path of the current page, e.g. "guides/install.md" */
  pagePath: string;
  title?: string;
  section?: unknown;
}): Breadcrumb[] {
  const trail = findBreadcrumbs(tree, (n) => isFile(n) && n.path === pagePath);
  const current: Breadcrumb = {
    label:
      title || trail.at(-1)?.label || pagePath.split('/').pop() || pagePath,
    href: null,
  };

  const sectionLabel = typeof section === 'string' ? section.trim() : '';
  if (sectionLabel) {
    return [{ label: sectionLabel, href: null }, current];
  }

  // An index/README page is the same node as its folder: drop the folder crumb
  const ancestors = trail
    .slice(0, -1)
    .filter(
      (crumb, i, arr) =>
        i < arr.length - 1 || crumb.href !== trail.at(-1)?.href,
    );
  if (ancestors.length === 0) return [];
  return [...ancestors, current];
}
