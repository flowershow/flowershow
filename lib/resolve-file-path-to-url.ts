import { customEncodeUrl } from "./url-encoder";

export const resolveFilePathToUrl = (filePath: string) => {
  let url = filePath
    .replace(/\.(mdx|md)/, "")
    .replace(/(\/)?(index|README)$/, ""); // remove index or README from the end of the permalink
  url = url.length > 0 ? url : "/"; // for home page
  return customEncodeUrl(url);
};
