export async function finalizePublishSuccess(sql, publishId) {
  await sql`
    UPDATE "Publish"
    SET status = 'success', completed_at = NOW()
    WHERE id = ${publishId} AND status = 'finalizing'
  `;
}

export async function finalizePublishTimeout(sql, publishId) {
  await sql`
    UPDATE "PublishFile"
    SET status = 'expired'
    WHERE publish_id = ${publishId} AND status = 'uploading'
  `;
  await sql`
    UPDATE "Publish"
    SET status = 'error', completed_at = NOW()
    WHERE id = ${publishId} AND status IN ('in_progress', 'finalizing')
  `;
}
