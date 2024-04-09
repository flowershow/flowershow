import { isSupportedAssetExtension } from "./types";

export const filePathsToPermalinks = ({
  filePaths,
  ignorePatterns = [/\.gitignore/],
  rawBaseUrl, // for assets, e.g. r2 bucket or github raw url
  pathPrefix, // if the site is hosted in a subdirectory
}: {
  filePaths: string[];
  ignorePatterns?: Array<RegExp>;
  rawBaseUrl?: string;
  pathPrefix?: string;
}) => {
  return filePaths
    .filter(
      (filePath) => !ignorePatterns.some((pattern) => filePath.match(pattern)),
    )
    .map((filePath) =>
      pathToPermalinkFunc({ filePath, rawBaseUrl, pathPrefix }),
    );
};

const pathToPermalinkFunc = ({
  filePath,
  rawBaseUrl,
  pathPrefix,
}: {
  filePath: string;
  rawBaseUrl?: string; // for assets, e.g. r2 bucket or github raw url
  pathPrefix?: string; // if the site is hosted in a subdirectory
}) => {
  const permalink = filePath
    .replace(/\.(mdx|md)/, "")
    .replace(/(\/)?index$/, "") // remove index from the end of the file path
    .replace(/(\/)?README$/, ""); // remove README from the end of the file path
  // for embedded assets, keep the extension but add the path prefix, e.g. raw github url or r2 bucket
  const fileExtension = permalink.split(".").pop();
  if (fileExtension && isSupportedAssetExtension(fileExtension)) {
    return rawBaseUrl ? `${rawBaseUrl}/${permalink}` : permalink;
  }

  // TODO temporary hack for datahub.io/docs /collection /blog and /core
  // so that wikillinks also point to that instead of {user}/{project}/docs etc.
  let prefix: string | null = null;
  if (pathPrefix) {
    prefix = pathPrefix
      .replace(/\/@olayway\/docs/, "/docs")
      .replace(/\/@olayway\/blog/, "/blog")
      .replace(/\/@olayway\/collections/, "/collections");
  }

  return prefix ? `${prefix}/${permalink}` : permalink;
};
