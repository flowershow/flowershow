import matter from 'gray-matter';
import { imageSize, types as supportedImageTypes } from 'image-size';
import { computeGitBlobSha } from './github.js';
import {
  deleteFile,
  getPublishIdFromMetadata,
  readFileBytes,
} from './storage.js';
import { indexInTypesense } from './typesense.js';
import { captureError, generateId } from './utils.js';

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
        await processNonMarkdownFile({
          storage,
          sql,
          siteId,
          branch,
          path,
          publishId,
        });
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

    await processMarkdownFile({
      storage,
      sql,
      typesense,
      siteId,
      branch,
      path,
      publishId,
    });
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

const PAGE_EXTENSIONS = new Set(['md', 'mdx', 'canvas']);

function customEncodeSegment(segment) {
  return encodeURIComponent(segment).replace(/%20/g, '+').replace(/%2F/g, '/');
}

function filePathToSlug(filePath) {
  filePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const lastDot = filePath.lastIndexOf('.');
  const lastSlash = filePath.lastIndexOf('/');
  const extWithDot = lastDot > lastSlash ? filePath.slice(lastDot) : '';
  const ext = extWithDot.slice(1);

  let withoutExt = PAGE_EXTENSIONS.has(ext)
    ? filePath.slice(0, filePath.length - extWithDot.length)
    : filePath;

  const parts = withoutExt.split('/');
  const basename = parts[parts.length - 1];
  if (basename === 'README' || basename === 'index') {
    withoutExt = parts.slice(0, -1).join('/') || '/';
  }

  if (!withoutExt || withoutExt === '/') return '/';
  withoutExt = withoutExt.replace(/\/$/, '');

  return withoutExt.split('/').map(customEncodeSegment).join('/');
}

async function upsertBlob(
  sql,
  siteId,
  path,
  { sha, size, metadata, permalink, width, height },
) {
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

async function processMarkdownFile({
  storage,
  sql,
  typesense,
  siteId,
  branch,
  path,
  publishId,
}) {
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
        await deleteFile(storage, siteId, branch, path);
      } catch (deleteError) {
        console.error('Error deleting from storage:', deleteError.message);
      }
      await updatePublishFile(sql, publishId, path, 'success');
      return;
    }

    const blobId = await upsertBlob(sql, siteId, path, {
      sha,
      size,
      metadata,
      permalink,
    });
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

async function processNonMarkdownFile({
  storage,
  sql,
  siteId,
  branch,
  path,
  publishId,
}) {
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

// Polyfill Buffer for browser environment
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
globalThis.Buffer = globalThis.Buffer || {
  from: (data) => {
    if (typeof data === 'string') {
      return textEncoder.encode(data);
    }
    return data;
  },
  toString: (buffer) => {
    return textDecoder.decode(buffer);
  },
};

/**
 * Parse the R2/S3 object key into its components.
 * Expected format: {siteId}/{branch}/raw/{path}
 */
export function parseObjectKey(rawKey) {
  const m = rawKey.match(/^([^/]+)\/([^/]+)\/raw\/(.+)$/);
  if (!m) throw new Error(`Invalid key format: ${rawKey}`);
  const [, siteId, branch, path] = m;
  return { siteId, branch, path };
}

export function normalizePermalink(permalink) {
  if (typeof permalink !== 'string') {
    return null;
  }

  const trimmed = permalink.replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed ? `/${trimmed}` : null;
}

function normalizeImageExtension(ext) {
  if (!ext) {
    return null;
  }

  if (ext === 'jpeg') {
    return 'jpg';
  }

  if (ext === 'tif') {
    return 'tiff';
  }

  return ext;
}

export function isSupportedImagePath(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  const normalizedExt = normalizeImageExtension(ext);
  return normalizedExt ? supportedImageTypes.includes(normalizedExt) : false;
}

export function extractImageDimensions(path, content) {
  if (!isSupportedImagePath(path)) {
    return { width: null, height: null };
  }

  const dimensions = imageSize(content);

  if (!dimensions.width || !dimensions.height) {
    return { width: null, height: null };
  }

  return {
    width: dimensions.width,
    height: dimensions.height,
  };
}

export async function parseMarkdownForSync({ markdown, path }) {
  let parsed;

  try {
    const { data: frontmatter, content: body } = matter(markdown, {});

    const title =
      frontmatter.title ||
      (await extractTitle(body)) ||
      path
        .split('/')
        .pop()
        ?.replace(/\.(mdx|md)$/, '') ||
      '';

    parsed = {
      metadata: {
        ...frontmatter,
        title,
      },
      body,
    };
  } catch (error) {
    throw new Error(`Error parsing markdown: ${error}`);
  }

  const metadata = /** @type {Record<string, unknown>} */ (
    parsed.metadata || {}
  );
  const publish = metadata.publish !== false;

  return {
    metadata: {
      ...metadata,
      publish,
    },
    body: parsed.body,
    permalink: normalizePermalink(metadata.permalink),
    shouldPublish: publish,
  };
}

export const extractTitle = async (source) => {
  const heading = source.trim().match(/^#{1}[ ]+(.*)/);
  if (heading?.[1]) {
    const title = heading[1]
      // replace wikilink with only text value
      .replace(/\[\[([\S\s]*?)]]/, '$1')
      // remove markdown formatting
      .replace(/[_*~`>]/g, '') // remove markdown characters
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // remove links but keep the text
    return title.trim();
  }
  return null;
};
