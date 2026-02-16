export type ImageDimensionsMap = Record<
  string,
  { width: number; height: number }
>;

type BlobWithDimensions = {
  path: string;
  width: number | null;
  height: number | null;
};

export function buildImageDimensionsMap(
  blobs: BlobWithDimensions[],
  sitePrefix: string,
): ImageDimensionsMap {
  const map: ImageDimensionsMap = {};

  for (const blob of blobs) {
    if (blob.width != null && blob.height != null) {
      const key = `${sitePrefix}/${blob.path}`;
      map[key] = { width: blob.width, height: blob.height };
    }
  }

  return map;
}
