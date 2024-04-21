import { DataPackage } from "@/components/layouts/datapackage-types";
import { PageMetadata } from "@/server/api/types";
import { remark } from "remark";
import stripMarkdown, { Options } from "strip-markdown";
import { GitHubAPIRepoTree } from "./github";
import matter from "gray-matter";
import { Site } from "@prisma/client";
import { env } from "@/env.mjs";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

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
  site: SiteWithUser;
}): Promise<PageMetadata> => {
  // TODO try catch

  const { data: frontMatter } = matter(source);

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
  for (const resource of datapackage?.resources || []) {
    const file = tree.tree.find((file) => file.path === resource.path);
    if (file) {
      resource.size = file.size;
      resource.format = file.path.split(".").pop();
    }
  }

  // TODO get created and modified dates from github for each file ?

  delete frontMatter.datapackage;

  let _urlBase = `/@${site.user!.gh_username}/${site.projectName}`;

  // TODO this is a temporary hack for our special datahubio projects
  if (_urlBase === "/@olayway/blog") {
    _urlBase = "/blog";
  } else if (_urlBase === "/@olayway/docs") {
    _urlBase = "/docs";
  } else if (_urlBase === "/@olayway/collections") {
    _urlBase = "/collections";
  }

  // TODO better types
  return {
    _path: path,
    _url: resolveFilePathToUrl(path),
    _urlBase,
    _rawUrlBase: `https://${env.R2_BUCKET_DOMAIN}/${site.id}/${site.gh_branch}/raw`,
    _pagetype: _datapackage ? "dataset" : "story",
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
