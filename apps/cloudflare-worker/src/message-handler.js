import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import {
  extractImageDimensions,
  isSupportedImagePath,
  parseMarkdownForSync,
  parseObjectKey,
} from './processing-utils.js';
import { indexInTypesense } from './typesense.js';
import { captureError } from './helpers.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Read the publish-id from an R2/S3 object's custom metadata.
 * Returns null if the metadata is absent or the object is not found.
 */
async function getPublishIdFromMetadata(storage, key) {
  try {
    if (storage.type === 's3') {
      const resp = await storage.client.send(
        new HeadObjectCommand({ Bucket: storage.bucket, Key: key }),
      );
      return resp.Metadata?.['publish-id'] ?? null;
    }
    const obj = await storage.client.head(key);
    return obj?.customMetadata?.['publish-id'] ?? null;
  } catch {
    return null;
  }
}

async function getBlobId(sql, siteId, path) {
  const rows = await sql`
    SELECT id FROM "Blob"
    WHERE "site_id" = ${siteId}
      AND path     = ${path}
    ORDER BY "created_at" DESC
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error(`No blob found for path: ${path}`);
  return rows[0].id;
}

async function updatePublishFile(sql, publishId, path, status, errorMsg) {
  if (!publishId) return;
  if (status === 'error') {
    await sql`
      UPDATE "PublishFile"
      SET status = 'error', error = ${errorMsg ?? null}
      WHERE publish_id = ${publishId} AND path = ${path}
    `;
  } else {
    await sql`
      UPDATE "PublishFile"
      SET status = 'success'
      WHERE publish_id = ${publishId} AND path = ${path}
    `;
  }
}

// Atomic completion check: only the worker that processes the last file wins the
// UPDATE and sends publish-complete. All concurrent workers get 0 rows affected.
async function checkAndFinalizePublish(sql, env, publishId) {
  if (!publishId) return;
  const result = await sql`
    UPDATE "Publish" SET status = 'finalizing'
    WHERE id = ${publishId} AND status = 'in_progress'
      AND NOT EXISTS (
        SELECT 1 FROM "PublishFile"
        WHERE publish_id = ${publishId} AND status = 'uploading'
      )
  `;
  if (result.count !== 1) return;
  try {
    const instance = await env.PUBLISH_WORKFLOW.get(publishId);
    await instance.sendEvent({ name: 'publish-complete', payload: {} });
  } catch (err) {
    console.error(`Failed to send publish-complete for ${publishId}: ${err.message}`);
  }
}

async function processNonMarkdownFile({ storage, sql, siteId, branch, path, publishId }) {
  try {
    if (isSupportedImagePath(path)) {
      const blobId = await getBlobId(sql, siteId, path);
      let width = null;
      let height = null;

      try {
        const key = `${siteId}/${branch}/raw/${path}`;
        let buffer;
        if (storage.type === 's3') {
          const resp = await storage.client.send(
            new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
          );
          buffer = Buffer.from(await resp.Body.transformToByteArray());
        } else {
          const obj = await storage.client.get(key);
          if (obj) {
            buffer = new Uint8Array(await obj.arrayBuffer());
          }
        }
        if (buffer) {
          const dimensions = extractImageDimensions(path, buffer);
          width = dimensions.width;
          height = dimensions.height;
        }
      } catch (dimError) {
        console.error('Could not extract dimensions:', dimError.message);
      }

      await sql`
        UPDATE "Blob"
        SET width = ${width},
            height = ${height}
        WHERE id = ${blobId};
      `;
    }

    await updatePublishFile(sql, publishId, path, 'success');
  } catch (e) {
    await updatePublishFile(sql, publishId, path, 'error', e.message);
    throw e;
  }
}

async function processFile({ storage, sql, typesense, siteId, branch, path, publishId }) {
  const blobId = await getBlobId(sql, siteId, path);

  try {
    const key = `${siteId}/${branch}/raw/${path}`;

    let markdown;
    if (storage.type === 's3') {
      const resp = await storage.client.send(
        new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
      );
      const length = resp.ContentLength;
      if (length > MAX_FILE_BYTES) throw new Error(`File too large: ${length}`);
      markdown = await resp.Body.transformToString();
    } else {
      const obj = await storage.client.get(key);
      if (!obj) throw new Error(`Object not found: ${key}`);
      const length = obj.size;
      if (length > MAX_FILE_BYTES) throw new Error(`File too large: ${length}`);
      markdown = await obj.text();
    }

    const { metadata, body, permalink, shouldPublish } =
      await parseMarkdownForSync({ markdown, path });

    if (!shouldPublish) {
      try {
        if (storage.type === 's3') {
          await storage.client.send(
            new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }),
          );
        } else {
          await storage.client.delete(key);
        }
      } catch (deleteError) {
        console.error('Error deleting from storage:', deleteError.message);
      }

      await sql`
        DELETE FROM "Blob"
        WHERE id = ${blobId};
      `;

      try {
        await typesense.collections(siteId).documents(`${blobId}`).delete();
      } catch (_typesenseError) {
        // Document might not exist in index, which is fine
      }

      await updatePublishFile(sql, publishId, path, 'success');
      return;
    }

    await sql`
      UPDATE "Blob"
      SET metadata  = ${sql.json(metadata)},
          permalink = ${permalink}
      WHERE id = ${blobId};
    `;
    await indexInTypesense({ typesense, siteId, blobId, path, body, metadata });
    await updatePublishFile(sql, publishId, path, 'success');
  } catch (e) {
    console.error('Error in processFile:', {
      error: { message: e.message, stack: e.stack, name: e.name },
    });
    await updatePublishFile(sql, publishId, path, 'error', e.message);
    throw e;
  }
}

export async function handleMessage({ msg, storage, sql, typesense, env }) {
  // Hoisted so the outer catch can still run the completion check if processFile
  // marked the PublishFile as 'error' before re-throwing.
  let publishId = null;
  try {
    const rawKey = msg.body.object.key;
    const { siteId, branch, path } = parseObjectKey(rawKey);

    if (!/^[\w-]+$/.test(siteId) || !/^[\w-]+$/.test(branch)) {
      throw new Error(`Invalid siteId or branch: ${siteId}, ${branch}`);
    }

    const key = `${siteId}/${branch}/raw/${path}`;
    publishId = await getPublishIdFromMetadata(storage, key);

    if (!path.match(/\.(md|mdx)$/i)) {
      try {
        await processNonMarkdownFile({ storage, sql, siteId, branch, path, publishId });
      } catch (e) {
        console.error('Error processing non-markdown file:', {
          siteId,
          path,
          error: { message: e.message, stack: e.stack, name: e.name },
        });
        await captureError(env, {
          siteId,
          path,
          error_message: e.message,
          error_name: e.name,
          source: 'worker_non_markdown',
        });
      }
      await checkAndFinalizePublish(sql, env, publishId);
      return msg.ack();
    }

    await processFile({ storage, sql, typesense, siteId, branch, path, publishId });
    await checkAndFinalizePublish(sql, env, publishId);
    msg.ack();
  } catch (err) {
    const rawKey = msg.body.object.key;
    let siteId, path;
    try {
      ({ siteId, path } = parseObjectKey(rawKey));
    } catch {
      // key parse failed; use raw key for logging
    }
    console.error(
      {
        key: rawKey,
        error: { message: err.message, stack: err.stack, name: err.name },
      },
      'Error processing message',
    );
    await captureError(env, {
      siteId,
      path,
      error_message: err.message,
      error_name: err.name,
      source: 'worker_process_file',
    });
    // processFile marks PublishFile 'error' before re-throwing, so this may be
    // the last file. Run the check idempotently — the atomic UPDATE guards against
    // duplicates. Message will be retried if not acked.
    await checkAndFinalizePublish(sql, env, publishId);
  }
}
