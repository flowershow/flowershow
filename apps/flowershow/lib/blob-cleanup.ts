import { deleteFile } from '@/lib/content-store';

/**
 * Delete blobs from R2 storage only. DB and Typesense cleanup is handled async
 * by the Cloudflare Worker on the resulting R2 DeleteObject events.
 */
export async function deleteBlobs(
  siteId: string,
  paths: string[],
): Promise<string[]> {
  if (paths.length === 0) return [];

  const deletedPaths: string[] = [];

  await Promise.all(
    paths.map(async (path) => {
      try {
        await deleteFile({ projectId: siteId, path });
        deletedPaths.push(path);
      } catch (error) {
        console.error(
          `[deleteBlobs] R2 deletion failed for ${siteId}/${path}:`,
          error,
        );
      }
    }),
  );

  return deletedPaths;
}
