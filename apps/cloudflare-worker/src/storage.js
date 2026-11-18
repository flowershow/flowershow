import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getContentType } from '@flowershow/core';

/**
 * Most bytes the worker holds in memory for one file. Markdown is read whole
 * (it is parsed); other files are streamed, keeping at most this much of their
 * start (for image dimensions). The worker has 128 MB for up to 10 files at once.
 */
export const MAX_BUFFERED_BYTES = 10 * 1024 * 1024;

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

/** A storage error with `code` 'NOT_FOUND' or 'TOO_LARGE'. */
function storageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function s3Get(storage, key) {
  try {
    return await storage.client.send(
      new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
  } catch (error) {
    if (
      error?.name === 'NoSuchKey' ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      throw storageError('NOT_FOUND', `Object not found: ${key}`);
    }
    throw error;
  }
}

/**
 * The whole stored file. Throws an error with `code: 'NOT_FOUND'` when it is
 * missing and `code: 'TOO_LARGE'` when it is over MAX_BUFFERED_BYTES.
 */
export async function readFileBytes(storage, key) {
  if (storage.type === 's3') {
    const resp = await s3Get(storage, key);
    const length = resp.ContentLength;
    if (length > MAX_BUFFERED_BYTES)
      throw storageError('TOO_LARGE', `File too large: ${length}`);
    return new Uint8Array(await resp.Body.transformToByteArray());
  }
  const obj = await storage.client.get(key);
  if (!obj) throw storageError('NOT_FOUND', `Object not found: ${key}`);
  if (obj.size > MAX_BUFFERED_BYTES)
    throw storageError('TOO_LARGE', `File too large: ${obj.size}`);
  return new Uint8Array(await obj.arrayBuffer());
}

/**
 * The stored file as a stream, with its stored size. Throws an error with
 * `code: 'NOT_FOUND'` when it is missing.
 */
export async function openFileStream(storage, key) {
  if (storage.type === 's3') {
    const resp = await s3Get(storage, key);
    return {
      size: resp.ContentLength,
      stream: resp.Body.transformToWebStream(),
    };
  }
  const obj = await storage.client.get(key);
  if (!obj) throw storageError('NOT_FOUND', `Object not found: ${key}`);
  return { size: obj.size, stream: obj.body };
}

/**
 * Store a small, fully buffered object. Used for derived (converted) objects:
 * their keys include the source file's sha, so they never change once written.
 */
export async function putObject(storage, key, bytes, contentType) {
  const cacheControl = 'max-age=31536000, immutable';
  if (storage.type === 's3') {
    await storage.client.send(
      new PutObjectCommand({
        Bucket: storage.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );
  } else {
    await storage.client.put(key, bytes, {
      httpMetadata: { contentType, cacheControl },
    });
  }
}

/**
 * Store `size` bytes read from `stream`. R2 needs the length up front: the
 * stream goes through a FixedLengthStream, which also fails the upload when the
 * stream ends early or runs long.
 */
export async function uploadFile(
  storage,
  siteId,
  branch,
  filePath,
  stream,
  size,
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
    // Local dev (MinIO) only, so buffering the file is fine here.
    await storage.client.send(
      new PutObjectCommand({
        Bucket: storage.bucket,
        Key: key,
        Body: new Uint8Array(await new Response(stream).arrayBuffer()),
        ContentType: contentType,
        CacheControl: cacheControl,
        ...(publishId && { Metadata: { 'publish-id': publishId } }),
      }),
    );
  } else {
    const { readable, writable } = new FixedLengthStream(size);
    await Promise.all([
      stream.pipeTo(writable),
      storage.client.put(key, readable, {
        httpMetadata: { contentType, cacheControl },
        ...(publishId && { customMetadata: { 'publish-id': publishId } }),
      }),
    ]);
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

/**
 * Delete every object whose key starts with `prefix`, except those starting
 * with `except` when it is given.
 */
export async function deleteStoragePrefix(storage, prefix, { except } = {}) {
  const shouldDelete = (key) => !(except && key.startsWith(except));
  if (storage.type === 's3') {
    // Each pass lists from the start again (deleted keys are gone), so stop
    // once a page has nothing left to delete.
    let truncated = true;
    while (truncated) {
      const listed = await storage.client.send(
        new ListObjectsV2Command({ Bucket: storage.bucket, Prefix: prefix }),
      );
      const keys = (listed.Contents ?? [])
        .map(({ Key }) => Key)
        .filter(shouldDelete);
      if (keys.length === 0) break;
      await storage.client.send(
        new DeleteObjectsCommand({
          Bucket: storage.bucket,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
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
      const keys = listed.objects.map((o) => o.key).filter(shouldDelete);
      if (keys.length > 0) {
        await storage.client.delete(keys);
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }
}
