/**
 * Cancel all uploading PublishFile rows for prior in-progress github_webhook
 * publishes of the same site. Returns the publishIds that had files canceled
 * (caller should run checkPublishCompletion on each).
 */
export async function cancelSupersededGithubPublish(sql, siteId, newPublishId) {
  const rows = await sql`
    UPDATE "PublishFile" pf
    SET status = 'canceled'
    FROM "Publish" p
    WHERE pf.publish_id = p.id
      AND p.site_id = ${siteId}
      AND p.source = 'github_webhook'
      AND p.status = 'in_progress'
      AND pf.status = 'uploading'
      AND p.id != ${newPublishId}
    RETURNING p.id AS publish_id
  `;

  return [...new Set(rows.map((r) => r.publish_id))];
}

/**
 * Cancel uploading PublishFile rows for specific paths across all prior
 * publishes of the same site. Returns the publishIds that had files canceled.
 */
export async function cancelPublishFilesForPaths(sql, siteId, newPublishId, paths) {
  if (!paths || paths.length === 0) return [];

  const rows = await sql`
    UPDATE "PublishFile" pf
    SET status = 'canceled'
    FROM "Publish" p
    WHERE pf.publish_id = p.id
      AND p.site_id = ${siteId}
      AND pf.path = ANY(${paths})
      AND pf.status = 'uploading'
      AND p.id != ${newPublishId}
    RETURNING p.id AS publish_id
  `;

  return [...new Set(rows.map((r) => r.publish_id))];
}
