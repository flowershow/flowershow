// Word documents published as pages: convert the stored .docx to Markdown
// (plus extracted images) under a derived prefix keyed by the file's git sha,
// then index that Markdown as the page for the .docx Blob. Run by
// DocConversionWorkflow, one instance per (siteId, path, sha).
//
//   {siteId}/main/raw/{path}                     the Word file (the Blob)
//   {siteId}/main/derived/{path}/{sha}/index.md  converted Markdown
//   {siteId}/main/derived/{path}/{sha}/imageN.*  extracted images

import {
  derivedAssetKey,
  derivedAssetUrlPath,
  derivedMarkdownKey,
  derivedPrefix,
  getContentType,
} from '@flowershow/core';
import { convertDocx, DocxRejectedError } from './docx/convert.js';
import { computeGitBlobSha, hashGitBlobStream } from './github.js';
import {
  computeAppPath,
  indexMarkdownPage,
  revalidateIfPublishDone,
  revalidateSite,
  updatePublishFile,
  upsertBlob,
} from './queue-consumer.js';
import {
  deleteStoragePrefix,
  openFileStream,
  putObject,
  readFileBytes,
} from './storage.js';
import { captureError } from './utils.js';

/** Bump the suffix when conversion output changes, to allow re-conversion. */
export const CONVERTED_WITH = 'mammoth-1';

const rawKey = (siteId, path) => `${siteId}/main/raw/${path}`;
const shaFolder = (siteId, path, sha) =>
  `${siteId}/main/${derivedPrefix(path)}${sha}/`;

/**
 * Convert the stored Word file and write its images, then its `index.md`, to
 * the derived folder for `sha`. Returns `{ superseded: true }` without writing
 * anything when the stored file is gone or is no longer the version `sha`.
 * Throws DocxRejectedError (not worth retrying) for documents that are too
 * large or cannot be read.
 *
 * @returns {Promise<{ warnings: string[] } | { superseded: true }>}
 */
export async function convertDocument({ storage, siteId, path, sha }) {
  let bytes;
  try {
    bytes = await readFileBytes(storage, rawKey(siteId, path));
  } catch (err) {
    if (err?.code === 'NOT_FOUND') return { superseded: true };
    if (err?.code === 'TOO_LARGE') {
      throw new DocxRejectedError(
        'This Word document is larger than 10 MB, the conversion limit.',
      );
    }
    throw err;
  }
  if ((await computeGitBlobSha(bytes)) !== sha) return { superseded: true };

  const { markdown, warnings } = await convertDocx(bytes, {
    imageUrl: (name) => derivedAssetUrlPath(path, sha, name),
    onImage: (name, data, contentType) =>
      putObject(
        storage,
        derivedAssetKey(siteId, path, sha, name),
        data,
        contentType,
      ),
  });
  // Written last: its presence means the folder is complete.
  await putObject(
    storage,
    derivedMarkdownKey(siteId, path, sha),
    new TextEncoder().encode(markdown),
    getContentType('md'),
  );
  return { warnings };
}

/**
 * Index the converted Markdown as the page for the Word file: upsert its Blob
 * (the Word file's sha and size), links, tags and search document, and set the
 * PublishFile. Stops, removing its own derived folder, when the Word file was
 * deleted or replaced since conversion: the newer event owns the page.
 */
export async function indexConvertedDocument({
  storage,
  sql,
  typesense,
  env,
  siteId,
  path,
  sha,
  size,
  publishId,
  warnings = [],
}) {
  const ownFolder = shaFolder(siteId, path, sha);
  if ((await storedSha(storage, rawKey(siteId, path))) !== sha) {
    await deleteStoragePrefix(storage, ownFolder);
    await settleSupersededConversion({ sql, env, siteId, path, publishId });
    return;
  }

  let markdown = await readDerivedMarkdown(storage, siteId, path, sha);
  if (markdown === null) {
    // A concurrent conversion of an older version cleaned up this folder
    // between our convert and index steps: convert again.
    const converted = await convertDocument({ storage, siteId, path, sha });
    if (converted.superseded) {
      await deleteStoragePrefix(storage, ownFolder);
      await settleSupersededConversion({ sql, env, siteId, path, publishId });
      return;
    }
    markdown = await readDerivedMarkdown(storage, siteId, path, sha);
    if (markdown === null) {
      throw new Error('Converted Markdown is missing after conversion.');
    }
  }

  // A .md/.mdx page with the same URL wins: the app serves it, so the Word
  // file's page stays out of search to avoid a duplicate hit.
  const appPath = computeAppPath(path);
  const [markdownPage] = await sql`
    SELECT path FROM "Blob"
    WHERE site_id = ${siteId} AND app_path = ${appPath}
      AND (extension = 'md' OR extension = 'mdx')
    LIMIT 1
  `;

  // Deferred: the file could still be replaced between the sha check above and
  // these writes; the newer version's workflow then rewrites the Blob.
  const { blobId, fileError } = await indexMarkdownPage({
    storage,
    sql,
    typesense,
    env,
    siteId,
    path,
    markdown,
    sha,
    size,
    publishId,
    extraMetadata: { convertedWith: CONVERTED_WITH },
    searchable: !markdownPage,
  });

  if (blobId === null) {
    // `publish: false`: the Word file was deleted, and its DeleteObject event
    // removes the derived folder.
    await updatePublishFile(sql, publishId, path, 'success');
    await revalidateIfPublishDone({ sql, env, siteId, publishId });
    return;
  }

  const allWarnings = [...warnings];
  if (fileError) allWarnings.push(fileError);
  if (markdownPage) {
    allWarnings.push(
      `${markdownPage.path} already uses this URL, so this Word file is only available as a download.`,
    );
  }

  if (allWarnings.length > 0) {
    await updatePublishFile(
      sql,
      publishId,
      path,
      'error',
      `Converted with warnings: ${allWarnings.join('; ')}`,
    );
  } else {
    await updatePublishFile(sql, publishId, path, 'success');
  }
  // Purge the site's cache unconditionally (not only when this is the last
  // file of a publish, and also for anonymous publishes): the app caches page
  // content (with its image URLs) for 60s by blob id under the site tag, so the
  // older versions can only be deleted once no cached page points at them.
  // This purge comes after the PublishFile flip, so it also covers the
  // publish-completion purge that revalidateIfPublishDone would make.
  await revalidateSite({ env, siteId });
  await deleteStoragePrefix(storage, `${siteId}/main/${derivedPrefix(path)}`, {
    except: ownFolder,
  });
}

/**
 * Record a conversion that failed for good. The PublishFile gets a readable
 * error. A previously converted version stays live; when the file has no Blob
 * yet, it gets a plain (non-page) one so the Word file still downloads,
 * unless the stored file was deleted or replaced meanwhile (no ghost Blob).
 */
export async function recordConversionFailure({
  storage,
  sql,
  env,
  siteId,
  path,
  sha,
  size,
  publishId,
  error,
}) {
  const reason =
    typeof error === 'string' ? error : (error?.message ?? String(error));
  console.error('Word document conversion failed:', {
    siteId,
    path,
    error: reason,
  });
  await updatePublishFile(
    sql,
    publishId,
    path,
    'error',
    `Could not convert this Word document: ${reason}`,
  );
  const existing = await sql`
    SELECT id FROM "Blob" WHERE site_id = ${siteId} AND path = ${path}
  `;
  if (
    existing.length === 0 &&
    (await storedSha(storage, rawKey(siteId, path))) === sha
  ) {
    await upsertBlob(sql, siteId, path, { sha, size, appPath: null });
  }
  await captureError(env, {
    siteId,
    path,
    size,
    error_message: reason,
    error_name: typeof error === 'string' ? 'DocxRejectedError' : error?.name,
    source: 'worker_docx_convert',
  });
  await revalidateIfPublishDone({ sql, env, siteId, publishId });
}

/**
 * The Word file was deleted or replaced while this version was converting.
 * Close this upload's PublishFile (if still pending) so its publish can
 * finish; the newer version's own event sets the page.
 */
export async function settleSupersededConversion({
  sql,
  env,
  siteId,
  path,
  publishId,
}) {
  if (!publishId) return;
  await sql`
    UPDATE "PublishFile" SET status = 'canceled'
    WHERE publish_id = ${publishId} AND path = ${path} AND status = 'uploading'
  `;
  await revalidateIfPublishDone({ sql, env, siteId, publishId });
}

/** Git sha of the stored file, or null when it is gone. */
async function storedSha(storage, key) {
  try {
    const { size, stream } = await openFileStream(storage, key);
    const { sha } = await hashGitBlobStream(stream, size, 0);
    return sha;
  } catch (err) {
    if (err?.code === 'NOT_FOUND') return null;
    throw err;
  }
}

async function readDerivedMarkdown(storage, siteId, path, sha) {
  try {
    const bytes = await readFileBytes(
      storage,
      derivedMarkdownKey(siteId, path, sha),
    );
    return new TextDecoder().decode(bytes);
  } catch (err) {
    if (err?.code === 'NOT_FOUND') return null;
    throw err;
  }
}
