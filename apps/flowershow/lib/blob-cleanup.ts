import { deleteFile } from '@/lib/content-store';
import { deleteSiteDocument } from '@/lib/typesense';
import prisma from '@/server/db';

/**
 * Delete blobs from all stores: R2, Typesense search index, and database.
 *
 * Each R2/Typesense deletion is independent and errors are logged but don't
 * block the others.  The database deletion always runs so the blob records
 * don't get orphaned.
 */
export async function deleteBlobs(
  siteId: string,
  blobs: Array<{ id: string; path: string }>,
): Promise<string[]> {
  if (blobs.length === 0) return [];

  const deletedPaths: string[] = [];

  // 1. Delete from R2 storage (parallel, best-effort per file)
  await Promise.all(
    blobs.map(async (blob) => {
      try {
        await deleteFile({ projectId: siteId, path: blob.path });
        deletedPaths.push(blob.path);
      } catch (error) {
        console.error(
          `[deleteBlobs] R2 deletion failed for ${siteId}/${blob.path}:`,
          error,
        );
      }
    }),
  );

  // 2. Delete from Typesense search index (parallel, best-effort)
  await Promise.all(
    blobs.map(async (blob) => {
      try {
        await deleteSiteDocument(siteId, blob.id);
      } catch (error) {
        console.error(
          `[deleteBlobs] Typesense deletion failed for ${siteId}/${blob.id}:`,
          error,
        );
      }
    }),
  );

  // 3. Delete from database
  await prisma.blob.deleteMany({
    where: {
      id: { in: blobs.map((b) => b.id) },
    },
  });

  return deletedPaths;
}
