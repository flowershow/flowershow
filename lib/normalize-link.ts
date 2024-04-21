// TODO probably better to create a remark/rehype plugin for this
export const normalizeLink = (
  link: string,
  urlBase: string,
  filePath: string,
) => {
  let normalizedLink = link;

  if (filePath.endsWith("README.md") || filePath.endsWith("index.md")) {
    if (!link.startsWith(urlBase)) {
      if (link.startsWith("/")) {
        normalizedLink = `${urlBase}${link}`;
      } else if (link.startsWith("../")) {
        const parentPath = `/${filePath}`.split("/").slice(0, -2).join("/");
        normalizedLink = `${urlBase}${parentPath}/${link.replace("../", "")}`;
      } else {
        const parts = filePath.split("/");
        parts[parts.length - 1] = link.replace(/^\.\//, "");
        normalizedLink = `${urlBase}/${parts.join("/")}`;
      }
    }
  }
  return normalizedLink;
};
