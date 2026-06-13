/**
 * Look up the GitHub installation ID (BigInt as string) from the DB CUID.
 */
export async function getGitHubInstallationId(sql, installationDbId) {
  const [row] = await sql`
    SELECT installation_id FROM "GitHubInstallation" WHERE id = ${installationDbId}
  `;
  if (!row) throw new Error(`GitHubInstallation not found: ${installationDbId}`);
  return row.installation_id.toString();
}

/**
 * Returns a Map<path, sha> for all blobs belonging to a site.
 */
export async function getBlobShaMap(sql, siteId) {
  const rows = await sql`
    SELECT path, sha FROM "Blob" WHERE site_id = ${siteId}
  `;
  return new Map(rows.map((r) => [r.path, r.sha]));
}

/**
 * Upsert a Blob record. On conflict (site_id, path) updates sha, size, appPath.
 */
export async function upsertBlob(sql, siteId, { path, sha, size, appPath, extension }) {
  await sql`
    INSERT INTO "Blob" (id, site_id, path, sha, size, app_path, extension, updated_at)
    VALUES (gen_random_uuid(), ${siteId}, ${path}, ${sha}, ${size}, ${appPath}, ${extension}, NOW())
    ON CONFLICT (site_id, path) DO UPDATE
      SET sha      = EXCLUDED.sha,
          size     = EXCLUDED.size,
          app_path = EXCLUDED.app_path,
          updated_at = NOW()
  `;
}

/**
 * Batch-insert PublishFile rows with status=uploading.
 */
export async function createPublishFilesUploading(sql, publishId, items) {
  if (items.length === 0) return;
  const paths = items.map((i) => i.filePath);
  const changeTypes = items.map((i) => i.changeType);
  await sql`
    INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
    SELECT gen_random_uuid(), ${publishId}, path, change_type::"PublishFileChangeType", 'uploading'::"PublishFileStatus"
    FROM unnest(${paths}::text[], ${changeTypes}::text[]) AS t(path, change_type)
  `;
}

/**
 * Returns all blob paths for a site (used to compute deletions).
 */
export async function getBlobPaths(sql, siteId) {
  const rows = await sql`SELECT path FROM "Blob" WHERE site_id = ${siteId}`;
  return rows.map((r) => r.path);
}

/**
 * Delete Blob records for specific paths.
 */
export async function deleteBlobsByPath(sql, siteId, paths) {
  if (paths.length === 0) return;
  await sql`
    DELETE FROM "Blob"
    WHERE site_id = ${siteId} AND path = ANY(${paths}::text[])
  `;
}

/**
 * Insert terminal PublishFile rows for deletion results.
 * `deleted` paths get status=success, `failed` paths get status=error.
 */
export async function createTerminalPublishFilesForDeletions(sql, publishId, { deleted, failed }) {
  const allPaths = [...deleted, ...failed];
  if (allPaths.length === 0) return;
  const statuses = [
    ...deleted.map(() => 'success'),
    ...failed.map(() => 'error'),
  ];
  await sql`
    INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
    SELECT gen_random_uuid(), ${publishId}, path, 'deleted'::"PublishFileChangeType", status::"PublishFileStatus"
    FROM unnest(${allPaths}::text[], ${statuses}::text[]) AS t(path, status)
  `;
}
