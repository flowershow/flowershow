import { customEncodeUrl } from "./url-encoder";

/**
 * Resolve markdown file path to it's URL path
 */
export const resolveFilePathToUrlPath = ({
  filePath,
  prefix = "", // "/@<username>/<sitename>" or none if on custom domain
}: {
  filePath: string;
  prefix?: string;
  isSrcLink?: boolean;
}) => {
  let path = filePath
    .replace(/\.(mdx|md)/, "")
    .replace(/(\/)?(index|README)$/, ""); // remove index or README from the end of the permalink

  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  return `${prefix}${customEncodeUrl(path)}`;
};
