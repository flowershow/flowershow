export const filePathsToPermalinks = ({
  filePaths,
  ignorePatterns = [/\.gitignore/],
  ghRawUrl,
}: {
  filePaths: string[];
  ignorePatterns?: Array<RegExp>;
  ghRawUrl?: string;
}) => {
  return filePaths
    .filter((file) => !ignorePatterns.some((pattern) => file.match(pattern)))
    .map((file) => pathToPermalinkFunc(file, ghRawUrl));
};

const pathToPermalinkFunc = (filePath: string, ghRawUrl?: string) => {
  let permalink = filePath
    .replace(/\.(mdx|md)/, "")
    .replace(/(\/)?index$/, "") // remove index from the end of the file path
    .replace(/(\/)?README$/, ""); // remove README from the end of the file path
  // for images, keep the extension but add github pages domain prefix
  if (filePath.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
    permalink = ghRawUrl ? `https://${ghRawUrl}/${permalink}` : permalink;
    return permalink;
  }
  return permalink.length > 1 ? `/${permalink}` : "/";
};
