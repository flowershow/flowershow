import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function getPublishIdFromMetadata(storage, key) {
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

export async function readFileBytes(storage, key) {
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

export async function uploadFile(
  storage,
  siteId,
  branch,
  filePath,
  content,
  extension,
  publishId,
) {
  const key = `${siteId}/${branch}/raw/${filePath}`;
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

export async function deleteFile(storage, siteId, branch, filePath) {
  const key = `${siteId}/${branch}/raw/${filePath}`;
  if (storage.type === 's3') {
    await storage.client.send(
      new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
  } else {
    await storage.client.delete(key);
  }
}

export async function deleteSiteStorage(storage, siteId) {
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

function getContentType(extension) {
  const types = {
    md: 'text/markdown',
    mdx: 'text/markdown',
    html: 'text/html',
    csv: 'text/csv',
    geojson: 'application/geo+json',
    json: 'application/json',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    canvas: 'application/json',
    base: 'application/yaml',
    css: 'text/css',
    js: 'text/javascript',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    webp: 'image/webp',
    avif: 'image/avif',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    webm: 'video/webm',
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
    opus: 'audio/opus',
  };
  return types[extension] || 'application/json';
}
