import { DataPackage } from "@/components/layouts/datapackage-types";
import { remark } from "remark";
import stripMarkdown, { Options } from "strip-markdown";

export const computeDataPackage = ({
  frontMatter,
  datapackage,
  source,
}: {
  frontMatter: any;
  datapackage: DataPackage | null;
  source: string;
}) => {
  if (!datapackage && !frontMatter.datapackage) {
    return undefined;
  }

  const title =
    datapackage?.title || frontMatter.title || extractTitle(source) || "";
  const description =
    datapackage?.description ||
    frontMatter.description ||
    extractDescription(source) ||
    "";

  return {
    ...datapackage,
    title,
    description,
  } as DataPackage;
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
