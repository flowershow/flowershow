import { DataPackage } from "@/components/layouts/datapackage-types";
import { PageMetadata } from "@/server/api/types";
import { remark } from "remark";
import stripMarkdown, { Options } from "strip-markdown";
import { GitHubAPIRepoTree } from "./github";
import matter from "gray-matter";
import { Site } from "@prisma/client";
import { env } from "@/env.mjs";

export const computeMetadata = async ({
  source,
  datapackage,
  path,
  tree,
  site,
}: {
  source: string;
  datapackage: DataPackage | null;
  path: string;
  tree: GitHubAPIRepoTree;
  site: Site;
}): Promise<PageMetadata> => {
  // TODO try catch

  const { data: frontMatter } = matter(source);

  const _datapackage = frontMatter.datapackage || datapackage;

  const title =
    frontMatter.title ||
    datapackage?.title ||
    (await extractTitle(source)) ||
    "";

  const description =
    frontMatter.description ||
    datapackage?.description ||
    (await extractDescription(source)) ||
    "";

  // add file sizes from github tree to datapackage resources
  for (const resource of datapackage?.resources || []) {
    const file = tree.tree.find((file) => file.path === resource.path);
    if (file) {
      resource.size = file.size;
      resource.format = file.path.split(".").pop();
    }
  }

  // TODO get created and modified dates from github for each file ?

  delete frontMatter.datapackage;

  // TODO better types
  return {
    _path: path,
    _url: resolveFilePathToUrl(path),
    _rawUrlBase: `https://${env.R2_BUCKET_DOMAIN}/${site.id}/${site.gh_branch}/raw`,
    _pagetype: datapackage ? "dataset" : "story",
    ..._datapackage,
    ...frontMatter,
    title,
    description,
  };
};

const resolveFilePathToUrl = (filePath: string) => {
  let url = filePath
    .replace(/\.(mdx|md)/, "")
    .replace(/(\/)?(index|README)$/, ""); // remove index or README from the end of the permalink
  url = url.length > 0 ? url : "/"; // for home page
  return encodeURI(url);
};

const extractTitle = async (source: string) => {
  const heading = source.trim().match(/^#\s+(.*)/);
  if (heading && heading[1]) {
    const title = heading[1]
      // replace wikilink with only text value
      .replace(/\[\[([\S]*?)]]/, "$1");

    const stripTitle = await remark().use(stripMarkdown).process(title);
    return stripTitle.toString().trim();
  }
  return null;
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
