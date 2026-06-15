import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { Client } from 'typesense';
import { cleanupExpiredSites } from './cleanup-expired-sites.js';
import { checkPublishCompletion } from './publish-completion.js';
import {
  extractImageDimensions,
  isSupportedImagePath,
  parseMarkdownForSync,
  parseObjectKey,
} from './processing-utils.js';

// --- CONFIGURATION & VALIDATION ---
const REQUIRED_ENV_VARS = ['DATABASE_URL'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB max for safety

export function validateEnv(env) {
  for (const v of REQUIRED_ENV_VARS) {
    if (!env[v]) throw new Error(`Missing required env var: ${v}`);
  }
}

// --- CLIENT INITIALIZATION ---
function getStorageClient(env) {
  if (env.ENVIRONMENT === 'dev') {
    const s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
    return { type: 's3', client: s3Client, bucket: env.S3_BUCKET };
  }
  return { type: 'r2', client: env.BUCKET, bucket: null };
}

function getPostgresClient(env) {
  return postgres(env.DATABASE_URL, {
    max: 1, // Minimize connections since we can't reuse them
    idle_timeout: 2, // Reduce idle timeout since we'll create new connections
    fetch_types: false,
  });
}

function getTypesenseClient(env) {
  if (!env.TYPESENSE_API_KEY || !env.TYPESENSE_HOST) return null;
  return new Client({
    nodes: [
      {
        host: env.TYPESENSE_HOST,
        port: Number.parseInt(env.TYPESENSE_PORT, 10),
        protocol: env.TYPESENSE_PROTOCOL,
      },
    ],
    apiKey: env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 2,
  });
}

// --- HELPERS ---

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
    SELECT id FROM \"Blob\"
    WHERE \"site_id\" = ${siteId}
      AND path     = ${path}
    ORDER BY \"created_at\" DESC
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

async function ensureTypesenseCollection(typesense, siteId) {
  try {
    await typesense.collections().create({
      name: `${siteId}`,
      fields: [
        { name: 'title', type: 'string', facet: false },
        { name: 'content', type: 'string', facet: false },
        { name: 'path', type: 'string', facet: false },
        { name: 'description', type: 'string', facet: false, optional: true },
        { name: 'authors', type: 'string[]', facet: false, optional: true },
        { name: 'date', type: 'int64', facet: false, optional: true },
      ],
    });
  } catch (err) {
    if (err?.httpStatus !== 409) throw err; // 409 = already exists
  }
}

async function indexInTypesense({
  typesense,
  siteId,
  blobId,
  path,
  body,
  metadata,
}) {
  if (!typesense) return;
  try {
    const document = {
      title: metadata.title,
      content: body,
      path,
      description: metadata.description,
      authors: metadata.authors,
      date: metadata.date ? new Date(metadata.date).getTime() / 1000 : null,
      id: `${blobId}`,
    };
    try {
      await typesense.collections(siteId).documents().upsert(document);
    } catch (err) {
      if (err?.httpStatus !== 404) throw err;
      // Collection not yet created by the Workflow (race condition) — create and retry.
      await ensureTypesenseCollection(typesense, siteId);
      await typesense.collections(siteId).documents().upsert(document);
    }
  } catch (err) {
    console.error(`Failed indexing document: ${`${siteId} - ${path}`}`, err);
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

async function processFile({
  storage,
  sql,
  typesense,
  siteId,
  branch,
  path,
  publishId,
}) {
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

    // Parse markdown
    const { metadata, body, permalink, shouldPublish } =
      await parseMarkdownForSync({ markdown, path });

    // Check if publish is false in frontmatter
    if (!shouldPublish) {
      // Remove from storage (R2/S3)
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

      // Remove from database
      await sql`
        DELETE FROM \"Blob\"
        WHERE id = ${blobId};
      `;

      // Remove from Typesense index if it exists
      try {
        await typesense.collections(siteId).documents(`${blobId}`).delete();
      } catch (_typesenseError) {
        // Document might not exist in index, which is fine
      }

      await updatePublishFile(sql, publishId, path, 'success');
      return;
    }

    // Update Blob metadata
    await sql`
      UPDATE \"Blob\"
      SET metadata  = ${sql.json(metadata)},
          permalink = ${permalink}
      WHERE id = ${blobId};
    `;
    await indexInTypesense({ typesense, siteId, blobId, path, body, metadata });
    await updatePublishFile(sql, publishId, path, 'success');
  } catch (e) {
    console.error('Error in processFile:', {
      error: {
        message: e.message,
        stack: e.stack,
        name: e.name,
      },
    });
    await updatePublishFile(sql, publishId, path, 'error', e.message);
    throw e; // Re-throw to be caught by handleMessage
  }
}

async function notifyWorkflowIfComplete(sql, publishId, env) {
  const won = await checkPublishCompletion(sql, publishId);

  if (!won) {
    // checkPublishCompletion only wins when status is 'in_progress'.
    // If a prior sendEvent attempt failed after it set the status to 'finalizing',
    // the event was never delivered. Allow a retry in that case.
    const rows = await sql`SELECT status FROM "Publish" WHERE id = ${publishId} LIMIT 1`;
    if (rows[0]?.status !== 'finalizing') return;
  }

  if (env.PUBLISH_WORKFLOW) {
    const instance = await env.PUBLISH_WORKFLOW.get(publishId);
    await instance.sendEvent({ type: 'publish-complete', payload: {} });
  }
}

// --- POSTHOG ERROR REPORTING ---
async function captureError(env, properties) {
  if (!env.POSTHOG_KEY) return;
  try {
    const host = env.POSTHOG_HOST || 'https://eu.i.posthog.com';
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.POSTHOG_KEY,
        event: '$exception',
        distinct_id: 'system',
        properties,
      }),
    });
  } catch {
    // Never let PostHog errors affect the worker
  }
}

// --- MESSAGE HANDLER ---
async function handleMessage({ msg, storage, sql, typesense, env }) {
  try {
    const rawKey = msg.body.object.key;
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
      if (publishId) await notifyWorkflowIfComplete(sql, publishId, env);
      return msg.ack();
    }

    await processFile({
      storage,
      sql,
      typesense,
      siteId,
      branch,
      path,
      publishId,
    });
    if (publishId) await notifyWorkflowIfComplete(sql, publishId, env);
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
        error: {
          message: err.message,
          stack: err.stack,
          name: err.name,
        },
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
    // Let Cloudflare handle retries
  }
}

export default {
  // HTTP endpoint (health + dev adapter)
  async fetch(request, env, _ctx) {
    validateEnv(env);
    const url = new URL(request.url);

    if (env.ENVIRONMENT === 'dev' && url.pathname === '/queue') {
      let event;
      try {
        event = await request.json();
      } catch {
        return new Response('Invalid JSON', { status: 400 });
      }
      const rawKey = event.Records?.[0]?.s3?.object?.key;
      if (!rawKey) {
        return new Response('Bad S3 event', { status: 400 });
      }
      // Spaces in object keys from Minio are encoded as +
      const decodedKey = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      await env.FILE_PROCESSOR_QUEUE.send({ object: { key: decodedKey } });
      return new Response('Queued', { status: 200 });
    }

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    if (request.method === 'POST' && url.pathname === '/internal/workflows/publish/start') {
      const secret = env.INTERNAL_API_SECRET;
      if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      if (!env.PUBLISH_WORKFLOW) {
        return new Response('Workflow binding not available', { status: 503 });
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response('Invalid JSON', { status: 400 });
      }
      const { publishId, siteId } = body;
      if (!publishId || !siteId) {
        return new Response('Missing publishId or siteId', { status: 400 });
      }
      await env.PUBLISH_WORKFLOW.create({ id: publishId, params: { publishId, siteId } });
      return new Response('OK', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },

  // Queue consumer entry point
  async queue(batch, env, _ctx) {
    validateEnv(env);
    const storage = getStorageClient(env);
    const sql = getPostgresClient(env);
    const typesense = getTypesenseClient(env);

    // Process all messages in parallel
    await Promise.all(
      batch.messages.map((msg) =>
        handleMessage({ msg, storage, sql, typesense, env }),
      ),
    );
  },

  // Cron trigger — daily at 3 AM UTC (configured in wrangler.flowershow.toml)
  async scheduled(_event, env, _ctx) {
    validateEnv(env);
    const sql = getPostgresClient(env);
    const typesense = getTypesenseClient(env);
    await cleanupExpiredSites(sql, env.BUCKET ?? null, typesense);
    await sql.end();
  },
};
