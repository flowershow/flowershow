import { DataPackage } from "@/components/layouts/datapackage-types";
import { PageMetadata } from "@/server/api/types";
import { remark } from "remark";
import stripMarkdown, { Options } from "strip-markdown";
import { GitHubAPIRepoTree } from "./github";
import matter from "gray-matter";
import { resolveLink } from "@/lib/resolve-link";
import { customEncodeUrl } from "./url-encoder";
import { extractTitle } from "./extract-title";

export const computeMetadata = async ({
  source,
  datapackage,
  path,
  tree,
  contentStoreUrlBase,
}: {
  source: string;
  datapackage: DataPackage | null;
  path: string;
  tree: GitHubAPIRepoTree;
  contentStoreUrlBase: string;
}): Promise<PageMetadata> => {
  const { data: frontMatter } = matter(source, {});

  const _datapackage = frontMatter.datapackage || datapackage;
  const isDatapackage = !!_datapackage;

  const title =
    frontMatter.title ||
    _datapackage?.title ||
    (await extractTitle(source)) ||
    "";

  const description =
    frontMatter.description ||
    _datapackage?.description ||
    (isDatapackage && (await extractDescription(source))) ||
    "";

  // add file sizes from github tree to datapackage resources
  for (const resource of _datapackage?.resources || []) {
    const absoluteResourcePath = resolveLink({
      link: resource.path,
      filePath: path,
    }).slice(1);
    const file = tree.tree.find((file) => file.path === absoluteResourcePath);
    if (file) {
      resource.size = file.size;
      resource.format = file.path.split(".").pop();
      resource.path = contentStoreUrlBase + "/" + absoluteResourcePath;
    }
  }

  delete frontMatter.datapackage;

  // TODO better types
  return {
    _path: path,
    _url: resolveFilePathToUrl(path),
    _pagetype: _datapackage ? "dataset" : "story",
    ..._datapackage,
    ...frontMatter,
    title,
    description,
  };
};

export const resolveFilePathToUrl = (filePath: string) => {
  let url = filePath
    .replace(/\.(mdx|md)/, "")
    .replace(/(\/)?(index|README)$/, ""); // remove index or README from the end of the permalink
  url = url.length > 0 ? url : "/"; // for home page
  return customEncodeUrl(url);
};

const extractDescription = async (source: string) => {
  const content = source
    // remove frontmatter
    .replace(/---[\s\S]*---/g, "")
    // remove commented lines
    .replace(/{\/\*.*\*\/}/g, "")
    // remove youtube links
    .replace(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/gm, "")
    // replace wikilinks with only text
    .replace(/([^!])\[\[(\S*?)\]]/g, "$1$2")
    // remove wikilink images
    .replace(/!\[[\S]*?]]/g, "");

  // remove markdown formatting
  const stripped = await remark()
    .use(stripMarkdown, {
      remove: ["heading", "blockquote", "list", "image", "html", "code"],
    } as Options)
    .process(content);

  if (stripped.value) {
    const description: string = stripped.value.toString().slice(0, 200);
    return description + "...";
  }
  return null;
};
