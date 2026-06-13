/**
 * @param {import('postgres').Sql} sql
 * @param {{ list: Function, delete: Function } | null} bucket
 * @param {{ collections: Function } | null} typesense
 */
export async function cleanupExpiredSites(sql, bucket, typesense) {
  const expiredSites = await sql`
    SELECT id, project_name FROM "Site"
    WHERE is_temporary = true AND expires_at <= NOW()
  `;

  if (expiredSites.length === 0) return { deleted: 0, failed: 0, results: [] };

  const results = await Promise.all(
    expiredSites.map(async (site) => {
      try {
        // Delete from DB (cascades to Blobs, PublishFiles, etc.)
        await sql`DELETE FROM "Site" WHERE id = ${site.id}`;

        // Delete all R2 objects for this site
        await deleteR2Objects(bucket, site.id);

        // Delete Typesense collection (best-effort)
        if (typesense) {
          try {
            await typesense.collections(site.id).delete();
          } catch (_) {}
        }

        return { siteId: site.id, status: 'deleted' };
      } catch (error) {
        return { siteId: site.id, status: 'error', error: error.message };
      }
    }),
  );

  return {
    deleted: results.filter((r) => r.status === 'deleted').length,
    failed: results.filter((r) => r.status === 'error').length,
    results,
  };
}

async function deleteR2Objects(bucket, siteId) {
  if (!bucket) return;
  let cursor;
  do {
    const listed = await bucket.list({ prefix: `${siteId}/`, cursor });
    const keys = listed.objects.map((o) => o.key);
    if (keys.length > 0) await bucket.delete(keys);
    cursor = listed.truncated ? listed.cursor : null;
  } while (cursor);
}
