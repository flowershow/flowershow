export async function checkPublishCompletion(sql, publishId) {
  const result = await sql`
    UPDATE "Publish" SET status = 'finalizing'
    WHERE id = ${publishId}
      AND status = 'in_progress'
      AND NOT EXISTS (
        SELECT 1 FROM "PublishFile"
        WHERE publish_id = ${publishId} AND status = 'uploading'
      )
  `;
  return result.count === 1;
}
