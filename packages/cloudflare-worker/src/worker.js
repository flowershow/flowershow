import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { imageSize, types as supportedImageTypes } from 'image-size';
import postgres from 'postgres';
import { Client } from 'typesense';
import { parseMarkdownFile } from './parser';

// --- CONFIGURATION & VALIDATION ---
const REQUIRED_ENV_VARS = ['DATABASE_URL'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB max for safety

function validateEnv(env) {
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
  return new Client({
    nodes: [
      {
        host: env.TYPESENSE_HOST,
        port: Number.parseInt(env.TYPESENSE_PORT),
        protocol: env.TYPESENSE_PROTOCOL,
      },
    ],
    apiKey: env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 2,
  });
}

// --- HELPERS ---
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

async function indexInTypesense({
  typesense,
  siteId,
  blobId,
  path,
  body,
  metadata,
}) {
  try {
    // Create document for indexing
    const document = {
      title: metadata.title,
      content: body,
      path,
      description: metadata.description,
      authors: metadata.authors,
      date: metadata.date ? new Date(metadata.date).getTime() / 1000 : null,
      id: `${blobId}`, // Unique ID for the document
    };

    // Index the document
    await typesense.collections(siteId).documents().upsert(document);
  } catch {
    console.error(`Failed indexing document: ${`${siteId} - ${path}`}`);
  }
}

async function processNonMarkdownFile({ storage, sql, siteId, branch, path }) {
  const blobId = await getBlobId(sql, siteId, path);
  let width = null;
  let height = null;

  // Check if this is a supported image type before fetching from storage
  const ext = path.split('.').pop()?.toLowerCase();
  const normalizedExt = ext === 'jpeg' ? 'jpg' : ext === 'tif' ? 'tiff' : ext;
  const isImage = supportedImageTypes.includes(normalizedExt);

  if (isImage) {
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
        const dimensions = imageSize(buffer);
        if (dimensions.width && dimensions.height) {
          width = dimensions.width;
          height = dimensions.height;
        }
      }
    } catch (dimError) {
      console.error('Could not extract dimensions:', dimError.message);
    }
  }

  await sql`
		UPDATE "Blob"
		SET "sync_status" = 'SUCCESS',
		    "sync_error" = NULL,
		    width = ${width},
		    height = ${height}
		WHERE id = ${blobId};
	`;
}

async function processFile({ storage, sql, typesense, siteId, branch, path }) {
  const blobId = await getBlobId(sql, siteId, path);

  // Mark as PROCESSING before we start parsing
  await sql`
		UPDATE "Blob"
		SET "sync_status" = 'PROCESSING'
		WHERE id = ${blobId};
	`;

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

    // 3) Parse markdown
    const { metadata, body } = await parseMarkdownFile(markdown, path);

    // Check if publish is false in frontmatter
    if (metadata.publish === false) {
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
      } catch (typesenseError) {
        // Document might not exist in index, which is fine
      }

      return; // Exit early, don't process further
    }

    // 4) Update DB metadata (only if publish is not false)
    // Normalize permalink by removing leading and trailing slashes if present
    const permalink = metadata.permalink
      ? metadata.permalink.replace(/^\/+/, '').replace(/\/+$/, '')
      : null;

    await sql`
		    UPDATE \"Blob\"
		    SET metadata = ${sql.json(metadata)},
		        permalink = ${permalink},
		        \"sync_status\" = 'SUCCESS',
		        \"sync_error\"  = NULL
		    WHERE id = ${blobId};
		  `;
    await indexInTypesense({ typesense, siteId, blobId, path, body, metadata });
  } catch (e) {
    console.error('Error in processFile:', {
      error: {
        message: e.message,
        stack: e.stack,
        name: e.name,
      },
    });
    // 4) Update DB metadata
    await sql`
      UPDATE \"Blob\"
      SET \"sync_status\" = 'ERROR',
          \"sync_error\"  = ${e.message}
      WHERE id = ${blobId};
    `;
    throw e; // Re-throw to be caught by handleMessage
  }
}

// --- MESSAGE HANDLER ---
async function handleMessage({ msg, storage, sql, typesense }) {
  try {
    const rawKey = msg.body.object.key;

    const m = rawKey.match(/^([^/]+)\/([^/]+)\/raw\/(.+)$/);
    if (!m) throw new Error(`Invalid key format: ${rawKey}`);
    const [, siteId, branch, path] = m;

    if (!/^[\w-]+$/.test(siteId) || !/^[\w-]+$/.test(branch)) {
      throw new Error(`Invalid siteId or branch: ${siteId}, ${branch}`);
    }
    if (!path.match(/\.(md|mdx)$/i)) {
      try {
        await processNonMarkdownFile({ storage, sql, siteId, branch, path });
      } catch (e) {
        console.error('Error processing non-markdown file:', e.message);
      }
      return msg.ack();
    }

    // Skip files inside _flowershow/ directory
    if (path.includes('_flowershow/')) {
      return msg.ack();
    }

    await processFile({ storage, sql, typesense, siteId, branch, path });
    msg.ack();
  } catch (err) {
    console.error(
      {
        key: msg.body.object.key,
        error: {
          message: err.message,
          stack: err.stack,
          name: err.name,
        },
      },
      'Error processing message',
    );
    // Let Cloudflare handle retries
  }
}

export default {
  // HTTP endpoint (health + dev adapter)
  async fetch(request, env, ctx) {
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
    return new Response('Not Found', { status: 404 });
  },

  // Queue consumer entry point
  async queue(batch, env, ctx) {
    validateEnv(env);
    const storage = getStorageClient(env);
    const sql = getPostgresClient(env);
    const typesense = getTypesenseClient(env);

    // Process all messages in parallel
    await Promise.all(
      batch.messages.map((msg) =>
        handleMessage({ msg, storage, sql, typesense }),
      ),
    );
  },
};
