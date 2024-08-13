const normalizeUrl = (path: string) => {
  return path?.startsWith("/") ? path : "/" + path;
};

const isPathIncluded = (path: string, collection: string[]) => {
  path = normalizeUrl(path);
  return collection.some((item) => {
    item = normalizeUrl(item);
    return item === path || path.startsWith(item + "/");
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
