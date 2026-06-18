import { isPathVisible } from './path-utils.js';

export function normalizeRootDir(rootDir) {
  return rootDir ? `${rootDir.replace(/^(.?\/)+|\/+$/g, '')}/` : '';
}

export function createBatches(items, batchSize) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Computes which files from the GitHub tree need to be upserted.
 * Returns items with { ghTreeItem, filePath, changeType }.
 */
export function computeFilesToUpsert(existingBlobs, gitHubTree, normalizedRootDir, includes, excludes, forceSync) {
  const blobShaMap = new Map(existingBlobs.map((b) => [b.path, b.sha]));

  return gitHubTree.tree
    .filter(
      (item) =>
        item.type !== 'tree' &&
        item.path.startsWith(normalizedRootDir) &&
        isPathVisible(item.path, includes, excludes),
    )
    .map((item) => {
      const filePath = item.path.replace(normalizedRootDir, '');
      return {
        ghTreeItem: item,
        filePath,
        changeType: blobShaMap.has(filePath) ? 'updated' : 'added',
      };
    })
    .filter(
      ({ ghTreeItem, filePath }) =>
        forceSync ||
        !blobShaMap.has(filePath) ||
        blobShaMap.get(filePath) !== ghTreeItem.sha,
    );
}

/**
 * Computes which existing blobs are no longer in the GitHub tree and should be deleted.
 * Returns an array of blob objects from existingBlobs.
 */
export function computeFilesToDelete(existingBlobs, gitHubTree, normalizedRootDir, includes, excludes) {
  const visiblePaths = new Set(
    gitHubTree.tree
      .filter(
        (item) =>
          item.type !== 'tree' &&
          item.path.startsWith(normalizedRootDir) &&
          isPathVisible(item.path, includes, excludes),
      )
      .map((item) => item.path.replace(normalizedRootDir, '')),
  );

  return existingBlobs.filter((b) => !visiblePaths.has(b.path));
}
