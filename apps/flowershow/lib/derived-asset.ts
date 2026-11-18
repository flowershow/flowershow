import { parseDerivedUrlPath } from '@flowershow/core';

/** Image types the converter extracts from a Word document (see the worker). */
export const DERIVED_IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
]);

/** Whether a raw request (decoded path segments) is for the reserved `/_derived/` folder. */
export function isDerivedRequestPath(path: string[]): boolean {
  return path[0] === '_derived';
}

/**
 * Storage key for a `/_derived/{path}/{sha}/{name}` request, always under the
 * site resolved by the route (`siteId`), or null for an invalid path
 * (traversal, empty segments).
 */
export function derivedAssetR2Key(
  siteId: string,
  path: string[],
): string | null {
  const suffix = parseDerivedUrlPath(path.join('/'));
  return suffix ? `${siteId}/main/${suffix}` : null;
}
