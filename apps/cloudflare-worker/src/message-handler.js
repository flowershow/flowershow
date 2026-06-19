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
import { filePathToSlug, PAGE_EXTENSIONS } from './path-utils.js';
import { indexInTypesense } from './typesense.js';
import { captureError, generateId } from './helpers.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

async function computeGitBlobSha(content) {
  const header = new TextEncoder().encode(`blob ${content.length}\0`);
  const combined = new Uint8Array(header.length + content.length);
  combined.set(header);
  combined.set(content, header.length);
  const hashBuffer = await crypto.subtle.digest('SHA-1', combined);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function readFileBytes(storage, key) {
  if (storage.type === 's3') {
    const resp = await storage.client.send(
      new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
    const length = resp.ContentLength;
    if (length > MAX_FILE_BYTES) throw new Error(`File too large: ${length}`);
    return new Uint8Array(await resp.Body.transformToByteArray());
  }
  const obj = await storage.client.get(key);
  if (!obj) throw new Error(`Object not found: ${key}`);
  if (obj.size > MAX_FILE_BYTES) throw new Error(`File too large: ${obj.size}`);
  return new Uint8Array(await obj.arrayBuffer());
}

async function upsertBlob(sql, siteId, path, { sha, size, metadata, permalink, width, height }) {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  const appPath = PAGE_EXTENSIONS.has(extension) ? filePathToSlug(path) : null;
  const rows = await sql`
    INSERT INTO "Blob" (id, site_id, path, app_path, extension, sha, size, metadata, permalink, width, height, updated_at)
    VALUES (
      ${generateId()}, ${siteId}, ${path}, ${appPath}, ${extension},
      ${sha}, ${size}, ${metadata ?? null}, ${permalink ?? null},
      ${width ?? null}, ${height ?? null}, NOW()
    )
    ON CONFLICT (site_id, path) DO UPDATE SET
      app_path   = EXCLUDED.app_path,
      extension  = EXCLUDED.extension,
      sha        = EXCLUDED.sha,
      size       = EXCLUDED.size,
      metadata   = EXCLUDED.metadata,
      permalink  = EXCLUDED.permalink,
      width      = EXCLUDED.width,
      height     = EXCLUDED.height,
      updated_at = NOW()
    RETURNING id
  `;
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

async function processDeleteEvent({ sql, typesense, siteId, path }) {
  const deleted = await sql`
    DELETE FROM "Blob"
    WHERE site_id = ${siteId} AND path = ${path}
    RETURNING id
  `;
  if (deleted.length === 0) return;
  try {
    await typesense.collections(siteId).documents(`${deleted[0].id}`).delete();
  } catch (_) {
    // Document may not exist in Typesense (e.g. non-indexed file type)
  }
}

async function processMarkdownFile({ storage, sql, typesense, siteId, branch, path, publishId }) {
  const key = `${siteId}/${branch}/raw/${path}`;

  try {
    const contentBytes = await readFileBytes(storage, key);
    const markdown = new TextDecoder().decode(contentBytes);
    const sha = await computeGitBlobSha(contentBytes);
    const size = contentBytes.length;

    const { metadata, body, permalink, shouldPublish } =
      await parseMarkdownForSync({ markdown, path });

    if (!shouldPublish) {
      // Delete from R2; the resulting DeleteObject event drives Blob/Typesense cleanup.
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
      await updatePublishFile(sql, publishId, path, 'success');
      return;
    }

    const blobId = await upsertBlob(sql, siteId, path, { sha, size, metadata, permalink });
    await indexInTypesense({ typesense, siteId, blobId, path, body, metadata });
    await updatePublishFile(sql, publishId, path, 'success');
  } catch (e) {
    console.error('Error in processMarkdownFile:', {
      error: { message: e.message, stack: e.stack, name: e.name },
    });
    await updatePublishFile(sql, publishId, path, 'error', e.message);
    throw e;
  }
}

async function processNonMarkdownFile({ storage, sql, siteId, branch, path, publishId }) {
  const key = `${siteId}/${branch}/raw/${path}`;

  try {
    const contentBytes = await readFileBytes(storage, key);
    const sha = await computeGitBlobSha(contentBytes);
    const size = contentBytes.length;

    let width = null;
    let height = null;
    if (isSupportedImagePath(path)) {
      try {
        const dimensions = extractImageDimensions(path, contentBytes);
        width = dimensions.width;
        height = dimensions.height;
      } catch (dimError) {
        console.error('Could not extract dimensions:', dimError.message);
      }
    }

    await upsertBlob(sql, siteId, path, { sha, size, width, height });
    await updatePublishFile(sql, publishId, path, 'success');
  } catch (e) {
    await updatePublishFile(sql, publishId, path, 'error', e.message);
    throw e;
  }
}

export async function handleMessage({ msg, storage, sql, typesense, env }) {
  const rawKey = msg.body.object.key;

  if (msg.body.action === 'DeleteObject') {
    const { siteId, path } = parseObjectKey(rawKey);
    if (!/^[\w-]+$/.test(siteId)) throw new Error(`Invalid siteId: ${siteId}`);
    await processDeleteEvent({ sql, typesense, siteId, path });
    return msg.ack();
  }

  try {
    const { siteId, branch, path } = parseObjectKey(rawKey);

    if (!/^[\w-]+$/.test(siteId) || !/^[\w-]+$/.test(branch)) {
      throw new Error(`Invalid siteId or branch: ${siteId}, ${branch}`);
    }

    const key = `${siteId}/${branch}/raw/${path}`;
    const publishId = await getPublishIdFromMetadata(storage, key);

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
      return msg.ack();
    }

    await processMarkdownFile({ storage, sql, typesense, siteId, branch, path, publishId });
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
  }
}
