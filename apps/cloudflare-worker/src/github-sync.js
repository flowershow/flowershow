const MARKDOWN_EXTENSIONS = new Set(['md', 'mdx', 'canvas']);

function normalizeUrlSegment(seg) {
  return seg.startsWith('/') ? seg : `/${seg}`;
}

function isPathIncluded(path, collection) {
  const p = normalizeUrlSegment(path);
  return collection.some((item) => {
    const i = normalizeUrlSegment(item);
    return i === p || p.startsWith(i + '/');
  });
}

function isPathVisible(path, includes = [], excludes = []) {
  const normalized = normalizeUrlSegment(path);
  if (normalized === '/config.json' || normalized === '/custom.css') return true;
  if (isPathIncluded(path, excludes)) return false;
  if (isPathIncluded(path, includes)) return true;
  return includes.length === 0;
}

/**
 * Convert a file path to its URL app path.
 * Returns null for non-markdown files.
 */
export function computeAppPath(filePath) {
  const ext = filePath.split('.').pop();
  if (!MARKDOWN_EXTENSIONS.has(ext)) return null;
  const withLeadingSlash = `/${filePath}`;
  const stripped = withLeadingSlash
    .replace(/\.(mdx?|canvas)$/, '')
    .replace(/\/?(index|README)$/, '') || '/';
  return stripped || '/';
}

/**
 * Compute items to upsert (add or update) from a GitHub tree diff.
 * Returns a flat array — callers batch as needed.
 */
export function computeFilesToUpsert({
  tree,
  blobShaMap,
  rootDir = '',
  includes = [],
  excludes = [],
  forceSync = false,
}) {
  const normalizedRoot = rootDir ? rootDir.replace(/^(.?\/)+|\/+$/g, '') + '/' : '';

  return tree
    .filter(
      (item) =>
        item.type !== 'tree' &&
        item.path.startsWith(normalizedRoot) &&
        isPathVisible(item.path, includes, excludes),
    )
    .map((item) => {
      const filePath = item.path.slice(normalizedRoot.length);
      const changeType = blobShaMap.has(filePath) ? 'updated' : 'added';
      return { item, filePath, changeType };
    })
    .filter(({ item, filePath }) => {
      return forceSync || !blobShaMap.has(filePath) || blobShaMap.get(filePath) !== item.sha;
    })
    .map(({ item, filePath, changeType }) => ({
      filePath,
      sha: item.sha,
      size: item.size ?? 0,
      changeType,
      appPath: computeAppPath(filePath),
      extension: filePath.split('.').pop() || '',
    }));
}

/**
 * Compute paths to delete: blobs that no longer appear in the visible GitHub tree.
 */
export function computeFilesToDelete({
  tree,
  existingPaths,
  rootDir = '',
  includes = [],
  excludes = [],
}) {
  const normalizedRoot = rootDir ? rootDir.replace(/^(.?\/)+|\/+$/g, '') + '/' : '';

  const visiblePaths = new Set(
    tree
      .filter(
        (item) =>
          item.type !== 'tree' &&
          item.path.startsWith(normalizedRoot) &&
          isPathVisible(item.path, includes, excludes),
      )
      .map((item) => item.path.slice(normalizedRoot.length)),
  );

  return existingPaths.filter((p) => !visiblePaths.has(p));
}
