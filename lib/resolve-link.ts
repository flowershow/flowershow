import * as path from "path";
import { resolveSiteAlias } from "./resolve-site-alias";

export const resolveLink = ({
  link,
  filePath,
  // if site is deployed at default single-site url path, pass /@{username}/@{siteId}
  // if it's a link to an asset hosted on a different domain, pass the URL with path to it's root location
  prefixPath = "",
}: {
  link: string;
  filePath: string;
  prefixPath?: string;
}) => {
  if (link.startsWith("http")) {
    return link;
  }

  if (link.startsWith("#")) {
    return link;
  }

  let resolvedLink = link;

  // if filePath doesn't start with `/`, prefix it with `/`
  if (!filePath.startsWith("/")) {
    filePath = `/${filePath}`;
  }

  const isAbsolute = link.startsWith("/");

  // convert relative link to absolute
  if (!isAbsolute) {
    resolvedLink = path.resolve(path.dirname(filePath), link);
  }

  if (prefixPath) {
    resolvedLink = resolveSiteAlias(prefixPath, "to") + resolvedLink;
  }

  // if the link ends with `.md` or `.mdx` remove it
  resolvedLink = resolvedLink.replace(/\.mdx?$/, "");

  // if the link ends with `README` or `index` remove it
  resolvedLink = resolvedLink.replace(/\/(README|index)$/, "");

  // remove trailing slash unless it's the root
  if (resolvedLink !== "/") {
    resolvedLink = resolvedLink.replace(/\/$/, "");
  }

  // TODO links to headings

  return resolvedLink;
};
