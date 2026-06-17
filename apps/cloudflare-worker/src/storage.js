import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getContentType } from './path-utils.js';

export async function uploadFile(storage, siteId, filePath, content, extension, publishId) {
  const key = `${siteId}/main/raw/${filePath}`;
  const contentType = getContentType(extension);
  const isMedia =
    contentType.startsWith('image/') ||
    contentType.startsWith('video/') ||
    contentType.startsWith('audio/');
  const cacheControl = `max-age=${isMedia ? 300 : 0}, must-revalidate`;

  if (storage.type === 's3') {
    await storage.client.send(
      new PutObjectCommand({
        Bucket: storage.bucket,
        Key: key,
        Body: new Uint8Array(content),
        ContentType: contentType,
        CacheControl: cacheControl,
        ...(publishId && { Metadata: { 'publish-id': publishId } }),
      }),
    );
  } else {
    await storage.client.put(key, content, {
      httpMetadata: { contentType, cacheControl },
      ...(publishId && { customMetadata: { 'publish-id': publishId } }),
    });
  }
}

export async function deleteFile(storage, siteId, filePath) {
  const key = `${siteId}/main/raw/${filePath}`;
  if (storage.type === 's3') {
    await storage.client.send(
      new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
  } else {
    await storage.client.delete(key);
  }
}

async function deleteSiteStorage(storage, siteId) {
  const prefix = `${siteId}/`;
  if (storage.type === 's3') {
    let truncated = true;
    while (truncated) {
      const listed = await storage.client.send(
        new ListObjectsV2Command({ Bucket: storage.bucket, Prefix: prefix }),
      );
      if (!listed.Contents || listed.Contents.length === 0) break;
      await storage.client.send(
        new DeleteObjectsCommand({
          Bucket: storage.bucket,
          Delete: {
            Objects: listed.Contents.map(({ Key }) => ({ Key })),
            Quiet: true,
          },
        }),
      );
      truncated = listed.IsTruncated;
    }
  } else {
    let cursor;
    do {
      const listed = await storage.client.list({ prefix, cursor, limit: 1000 });
      const keys = listed.objects.map((o) => o.key);
      if (keys.length > 0) {
        await storage.client.delete(keys);
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }
}

export async function cleanupExpiredSites({ sql, storage, typesense }) {
  const expiredSites = await sql`
    SELECT id FROM "Site"
    WHERE is_temporary = true
      AND expires_at <= NOW()
  `;

  if (expiredSites.length === 0) {
    console.log('cleanupExpiredSites: no expired sites');
    return;
  }

  console.log(`cleanupExpiredSites: deleting ${expiredSites.length} sites`);

  for (const site of expiredSites) {
    try {
      await sql`DELETE FROM "Site" WHERE id = ${site.id}`;
      await deleteSiteStorage(storage, site.id);
      if (typesense) {
        try {
          await typesense.collections(`${site.id}`).delete();
        } catch (err) {
          if (err?.httpStatus !== 404) {
            console.error(`Failed to delete Typesense collection ${site.id}:`, err.message);
          }
        }
      }
      console.log(`cleanupExpiredSites: deleted site ${site.id}`);
    } catch (err) {
      console.error(`cleanupExpiredSites: failed for site ${site.id}:`, err.message);
    }
  }
}
