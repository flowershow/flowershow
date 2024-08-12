const normalizeUrl = (_url: string | undefined) => {
  return _url?.startsWith("/") ? _url : "/" + _url;
};

const isPathIncluded = (filePath: string, collection: string[]) => {
  filePath = normalizeUrl(filePath);
  return collection.some((item) => {
    item = normalizeUrl(item);
    return item === filePath || filePath?.startsWith(item + "/");
  });
};

export function isPathVisible(
  path: string,
  includes: string[],
  excludes: string[],
) {
  // Check if the path is excluded
  if (isPathIncluded(path, excludes)) {
    return false;
  }

  // Check if the path is included
  if (isPathIncluded(path, includes)) {
    return true;
  }

  return includes[0] ? false : true;
}
