import { PageMetadata } from "@/server/api/types";
import type { Blob as DbBlob } from "@prisma/client";
import { customEncodeUrl } from "./url-encoder";

type Meta = { title: string };

export interface FileNode<M = Meta> {
  kind: "file";
  label: string;
  name: string; // file name (e.g. "01-start-here.md")
  path: string; // full repo file path (e.g. "guide/quickstart/01-start-here.md")
  urlPath: string; // full URL path (e.g. "guide/quickstart/01-start-here")
  metadata: M;
}

export interface DirNode<M = Meta> {
  kind: "dir";
  label: string;
  name: string; // dir name (e.g. "guide", "quickstart")
  path: string; // full repo dir path (e.g. "guide/quickstart")
  urlPath: string; // full URL path (e.g. "guide/quickstart/01-start-here")
  children: Array<Node<M>>;
}

export type Node<M = Meta> = DirNode<M> | FileNode<M>;

export interface RootNode<M = Meta> {
  kind: "root";
  label: "root";
  path: null;
  children: Array<Node<M>>;
}

export type SiteTree<M = Meta> = RootNode<M>;

export const isDir = <M>(n: Node<M>): n is DirNode<M> => n.kind === "dir";
export const isFile = <M>(n: Node<M>): n is FileNode<M> => n.kind === "file";

export type SiteTreeSortOrder = "path" | "title";
type Grouping = "dirs-first" | "files-first" | "none";

type BuildOptions = {
  orderBy?: SiteTreeSortOrder; // default: "path"
  group?: Grouping; // default: "dirs-first"
  caseInsensitive?: boolean; // default: true
  numeric?: boolean; // default: true
  prefix?: string; // link prefix to use (/@username/sitename or none for custom domain sites)
};

export function buildSiteTree(
  blobs: DbBlob[],
  options: BuildOptions = {},
): SiteTree {
  const {
    orderBy = "path",
    group = "dirs-first",
    caseInsensitive = true,
    numeric = true,
    prefix = "",
  } = options;

  const root: SiteTree = {
    kind: "root",
    label: "root",
    path: null,
    children: [],
  };

  // Find or create a dir under `parentPath`
  const getOrCreateDir = <M = Meta>(
    parent: RootNode<M> | DirNode<M>,
    name: string,
  ): DirNode<M> => {
    let node = parent.children.find(
      (n): n is DirNode<M> => isDir(n) && n.name === name,
    );
    if (!node) {
      const nodePath = parent.path ? `${parent.path}/${name}` : name;
      node = {
        kind: "dir",
        label: toLabel(name),
        name,
        path: nodePath,
        urlPath: `${prefix}/${customEncodeUrl(nodePath)}`,
        children: [],
      };
      parent.children.push(node);
    }
    return node;
  };

  for (const blob of blobs) {
    const parts = blob.path.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let parent: RootNode | DirNode = root;
    // create dir nodes
    for (let i = 0; i < parts.length - 1; i++) {
      parent = getOrCreateDir(parent, parts[i]!);
    }

    // create file node (leaf)
    const filename = parts[parts.length - 1]!;
    const label = (blob.metadata as any).title;
    // TODO this is ugly
    const urlPath = `${prefix}${
      blob.appPath === "/" ? blob.appPath : "/" + blob.appPath
    }`;

    parent.children.push({
      kind: "file",
      label,
      name: filename,
      path: blob.path,
      urlPath,
      metadata: blob.metadata as Meta,
    });
  }

  sortTreeInPlace(root, { orderBy, group, caseInsensitive, numeric, prefix });

  return root;
}

function sortTreeInPlace<M>(
  parent: RootNode<M> | DirNode<M>,
  opts: Required<BuildOptions>,
) {
  parent.children.sort((a, b) => compareNodes(a, b, opts));
  for (const child of parent.children) {
    if (isDir(child)) sortTreeInPlace(child, opts);
  }
}

function compareNodes<M>(
  a: Node<M>,
  b: Node<M>,
  { orderBy, group, caseInsensitive, numeric }: Required<BuildOptions>,
) {
  // group dirs/files first if requested
  if (group !== "none") {
    const aRank =
      group === "dirs-first" ? (isDir(a) ? 0 : 1) : isFile(a) ? 0 : 1;
    const bRank =
      group === "dirs-first" ? (isDir(b) ? 0 : 1) : isFile(b) ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
  }

  // within same kind: compare by label|dir/file name
  const opts: Intl.CollatorOptions = {
    numeric,
    sensitivity: caseInsensitive ? "base" : "variant",
  };

  if (isFile(a) && isFile(b)) {
    const ka = orderBy === "title" ? a.label : a.name;
    const kb = orderBy === "title" ? b.label : b.name;
    return ka.localeCompare(kb, undefined, opts);
  }
  if (isDir(a) && isDir(b)) {
    // dirs: label compare feels nicer than full path inside a single parent
    return a.label.localeCompare(b.label, undefined, opts);
  }

  // fallback (should be unreachable because of grouping)
  return 0;
}

const toLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
