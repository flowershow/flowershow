import prisma from '@/server/db';

/**
 * How far back to look for publishes whose effects the worker may not have
 * written to the Blob table yet. Blob rows are updated asynchronously by the
 * worker after files land in R2 (and removed on R2 delete events), so right
 * after another publish the table can still describe the previous content.
 */
const RECENT_PUBLISH_WINDOW_MS = 15 * 60 * 1000;

/**
 * The server's view of a site's files: the Blob table, corrected for
 * publishes the worker has not caught up with (flowershow-88b). Used by the
 * sync route to diff a publish, and by the MCP `list-files` tool.
 *
 * - A path with an `uploading` PublishFile (from any not-yet-finished publish)
 *   is in `inFlightPaths`: its Blob sha may be stale, so it is never reported
 *   unchanged.
 * - A path deleted by a recent publish after its Blob row was last written
 *   is dropped from `existingBlobs`: it is already gone from R2, the Blob row
 *   is only waiting for the worker's delete event.
 * - `inFlightAdds` is the subset of `inFlightPaths` being uploaded as new
 *   files (no Blob row yet); merge mode counts them towards anonymous limits.
 */
export async function loadServerFileState(siteId: string) {
  const blobs = await prisma.blob.findMany({
    where: { siteId },
    select: { path: true, sha: true, size: true, updatedAt: true },
  });

  const windowStart = new Date(Date.now() - RECENT_PUBLISH_WINDOW_MS);
  const recentFiles = await prisma.publishFile.findMany({
    where: {
      publish: {
        siteId,
        // Bounded for unfinished publishes too, so orphans age out
        startedAt: { gt: windowStart },
      },
      OR: [
        { status: 'uploading' },
        { status: 'success', changeType: 'deleted' },
      ],
    },
    select: {
      path: true,
      status: true,
      changeType: true,
      publish: { select: { startedAt: true } },
    },
  });

  const inFlightPaths = new Set<string>();
  const inFlightAdds = new Set<string>();
  const latestDelete = new Map<string, Date>();
  for (const f of recentFiles) {
    if (f.status === 'uploading') {
      inFlightPaths.add(f.path);
      if (f.changeType === 'added') inFlightAdds.add(f.path);
    } else {
      const prev = latestDelete.get(f.path);
      if (!prev || f.publish.startedAt > prev) {
        latestDelete.set(f.path, f.publish.startedAt);
      }
    }
  }

  const existingBlobs = blobs.filter((blob) => {
    const deletedAt = latestDelete.get(blob.path);
    return !(deletedAt && deletedAt > blob.updatedAt);
  });

  return { existingBlobs, inFlightPaths, inFlightAdds };
}
