import { WorkflowEntrypoint } from 'cloudflare:workers';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { Client as TypesenseClient } from 'typesense';

const BATCH_SIZE = 20;

// --- ID generation ---
function generateId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  return `c${timestamp}${random}`;
}

// --- DB client ---
function getPostgresClient(env) {
  return postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 2,
    fetch_types: false,
  });
}

// --- Storage client (R2 in staging/production, S3/MinIO in dev) ---
function getStorageClient(env) {
  if (env.ENVIRONMENT === 'dev') {
    const s3 = new S3Client({
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
    return { type: 's3', client: s3, bucket: env.S3_BUCKET };
  }
  return { type: 'r2', client: env.BUCKET };
}

// --- Typesense client ---
function getTypesenseClient(env) {
  if (!env.TYPESENSE_API_KEY || !env.TYPESENSE_HOST) return null;
  return new TypesenseClient({
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

// --- Path utilities ---
function normalizeUrlPath(p) {
  const withLeading = p?.startsWith('/') ? p : `/${p}`;
  return withLeading.replace(/\/$/, '');
}

function isPathIncluded(p, collection) {
  p = normalizeUrlPath(p);
  return collection.some((item) => {
    item = normalizeUrlPath(item);
    return item === p || p.startsWith(`${item}/`);
  });
}

function isPathVisible(p, includes, excludes) {
  const normalized = normalizeUrlPath(p);
  if (normalized === '/config.json' || normalized === '/custom.css')
    return true;
  if (isPathIncluded(p, excludes)) return false;
  if (isPathIncluded(p, includes)) return true;
  return includes[0] ? false : true;
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

// --- Content type ---
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

// --- GitHub App token generation ---

function derLength(len) {
  if (len < 0x80) return new Uint8Array([len]);
  if (len < 0x100) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function derTLV(tag, value) {
  const lenBytes = derLength(value.length);
  const out = new Uint8Array(1 + lenBytes.length + value.length);
  out[0] = tag;
  out.set(lenBytes, 1);
  out.set(value, 1 + lenBytes.length);
  return out;
}

function concatBytes(...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// Web Crypto only accepts PKCS#8; GitHub generates PKCS#1 (BEGIN RSA PRIVATE KEY).
// Wrap PKCS#1 DER in a PKCS#8 PrivateKeyInfo envelope.
function pkcs1ToPkcs8(pkcs1Der) {
  const algorithmId = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ]);
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  return derTLV(0x30, concatBytes(version, algorithmId, derTLV(0x04, pkcs1Der)));
}

async function generateGitHubAppJWT(appId, privateKeyBase64) {
  const now = Math.floor(Date.now() / 1000);

  const toB64Url = (str) =>
    btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const objToB64Url = (obj) => toB64Url(JSON.stringify(obj));

  const header = objToB64Url({ alg: 'RS256', typ: 'JWT' });
  // iat is back-dated 60s to account for clock skew
  const payload = objToB64Url({ iat: now - 60, exp: now + 600, iss: appId });
  const message = `${header}.${payload}`;

  const pemStr = atob(privateKeyBase64);
  const pemBody = pemStr
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s/g, '');
  const rawDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const keyDer = pemStr.includes('BEGIN RSA PRIVATE KEY')
    ? pkcs1ToPkcs8(rawDer)
    : rawDer;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(message),
  );

  const sigB64Url = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${message}.${sigB64Url}`;
}

async function getGitHubInstallationToken(githubInstallationId, env) {
  const jwt = await generateGitHubAppJWT(
    env.GITHUB_APP_ID,
    env.GITHUB_APP_PRIVATE_KEY,
  );

  const response = await fetch(
    `https://api.github.com/app/installations/${githubInstallationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to get GitHub installation token: ${response.status} ${response.statusText} — ${body}`,
    );
  }

  const data = await response.json();
  return data.token;
}

// --- GitHub API ---
async function githubFetch(url, token, accept = 'application/vnd.github+json') {
  const response = await fetch(`https://api.github.com${url}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status} ${response.statusText}: ${url}`,
    );
  }
  return response;
}

async function fetchGitHubRepoTree(ghRepository, ghBranch, token) {
  const resp = await githubFetch(
    `/repos/${ghRepository}/git/trees/${encodeURIComponent(ghBranch)}?recursive=1`,
    token,
  );
  return resp.json();
}

async function fetchGitHubConfig(ghRepository, ghBranch, token) {
  try {
    const resp = await githubFetch(
      `/repos/${ghRepository}/contents/config.json?ref=${encodeURIComponent(ghBranch)}`,
      token,
    );
    const data = await resp.json();
    const decoded = atob(data.content.replace(/\n/g, ''));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

async function fetchGitHubFileRaw(ghRepository, fileSha, token) {
  const resp = await githubFetch(
    `/repos/${ghRepository}/git/blobs/${fileSha}`,
    token,
    'application/vnd.github.raw+json',
  );
  return resp.arrayBuffer();
}

// --- Storage operations ---
async function uploadFile(
  storage,
  siteId,
  filePath,
  content,
  extension,
  publishId,
) {
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

async function deleteFile(storage, siteId, filePath) {
  const key = `${siteId}/main/raw/${filePath}`;
  if (storage.type === 's3') {
    await storage.client.send(
      new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
  } else {
    await storage.client.delete(key);
  }
}

// --- Typesense collection management ---
async function ensureTypesenseCollection(typesense, siteId) {
  if (!typesense) return;
  try {
    const exists = await typesense.collections(siteId).exists();
    if (!exists) {
      await typesense.collections().create({
        name: siteId,
        fields: [
          { name: 'title', type: 'string', facet: false },
          { name: 'content', type: 'string', facet: false },
          { name: 'path', type: 'string', facet: false },
          { name: 'description', type: 'string', facet: false, optional: true },
          { name: 'authors', type: 'string[]', facet: false, optional: true },
          { name: 'date', type: 'int64', facet: false, optional: true },
        ],
      });
    }
  } catch (error) {
    if (error?.httpStatus !== 409) throw error;
  }
}

// --- The Workflow ---
export class SyncSiteWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {
      siteId,
      ghRepository,
      ghBranch,
      rootDir,
      githubInstallationId,
      forceSync = false,
      gitCommitSha = null,
      gitCommitMessage = null,
    } = event.payload;

    // Generate a fresh token on every run (outside any step so retries don't reuse a cached
    // expired value — GitHub App installation tokens expire in 1h).
    const accessToken = await getGitHubInstallationToken(
      githubInstallationId,
      this.env,
    );

    const sql = getPostgresClient(this.env);
    const storage = getStorageClient(this.env);
    const typesense = getTypesenseClient(this.env);

    // Step 1: Create Publish record
    const publish = await step.do('create-publish', async () => {
      const rows = await sql`
        INSERT INTO "Publish" (id, site_id, source, started_at, git_commit_sha, git_commit_message)
        VALUES (
          ${generateId()},
          ${siteId},
          'github_webhook',
          NOW(),
          ${gitCommitSha},
          ${gitCommitMessage}
        )
        RETURNING id
      `;
      return { id: rows[0].id };
    });

    // Step 2: Cancel uploading files from previous publishes for this site
    await step.do('cancel-superseded-publish-files', async () => {
      const previous = await sql`
        SELECT id FROM "Publish"
        WHERE site_id = ${siteId} AND id != ${publish.id}
      `;
      if (previous.length === 0) return;
      const ids = previous.map((p) => p.id);
      await sql`
        UPDATE "PublishFile"
        SET status = 'canceled'
        WHERE publish_id = ANY(${ids}) AND status = 'uploading'
      `;
    });

    // Step 3: Verify site exists
    await step.do('fetch-site', async () => {
      const rows = await sql`SELECT id FROM "Site" WHERE id = ${siteId}`;
      if (rows.length === 0) throw new Error(`Site ${siteId} not found.`);
    });

    // Step 4: Fetch site config (contentInclude / contentExclude)
    const { contentInclude: includes = [], contentExclude: excludes = [] } =
      await step.do('fetch-site-config', async () => {
        return fetchGitHubConfig(ghRepository, ghBranch, accessToken);
      });

    // Step 5: Ensure Typesense collection exists
    await step.do('check-typesense-collection', async () => {
      await ensureTypesenseCollection(typesense, siteId);
    });

    // Step 6: Fetch GitHub repo tree
    const gitHubTree = await step.do('fetch-github-tree', async () => {
      return fetchGitHubRepoTree(ghRepository, ghBranch, accessToken);
    });

    const normalizedRootDir = rootDir
      ? `${rootDir.replace(/^(.?\/)+|\/+$/g, '')}/`
      : '';

    // Step 7: Determine which files need to be upserted
    const fileBatchesToUpsert = await step.do(
      'get-file-batches-to-upsert',
      async () => {
        const existingBlobs = await sql`
          SELECT path, sha FROM "Blob" WHERE site_id = ${siteId}
        `;
        const blobShaMap = new Map(existingBlobs.map((b) => [b.path, b.sha]));

        const items = gitHubTree.tree
          .filter(
            (item) =>
              item.type !== 'tree' &&
              item.path.startsWith(normalizedRootDir) &&
              isPathVisible(item.path, includes, excludes),
          )
          .map((item) => {
            const filePath = item.path.replace(normalizedRootDir, '');
            return {
              ghTreeItem: item,
              filePath,
              changeType: blobShaMap.has(filePath) ? 'updated' : 'added',
            };
          })
          .filter(
            ({ ghTreeItem, filePath }) =>
              forceSync ||
              !blobShaMap.has(filePath) ||
              blobShaMap.get(filePath) !== ghTreeItem.sha,
          );

        const batches = [];
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          batches.push(items.slice(i, i + BATCH_SIZE));
        }
        return batches;
      },
    );

    // Step 8: Create PublishFile rows for all files to upsert
    await step.do('create-publish-files-for-upsert', async () => {
      const allItems = fileBatchesToUpsert.flat();
      if (allItems.length === 0) return;
      for (const { filePath, changeType } of allItems) {
        await sql`
          INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
          VALUES (${generateId()}, ${publish.id}, ${filePath}, ${changeType}, 'uploading')
        `;
      }
    });

    // Steps 9+: Download from GitHub and upload to R2 in batches
    await Promise.all(
      fileBatchesToUpsert.map((batch, index) =>
        step.do(`process-files-to-upsert-batch-${index}`, async () => {
          await Promise.all(
            batch.map(async ({ ghTreeItem, filePath }) => {
              try {
                const extension = ghTreeItem.path.split('.').pop() || '';
                const urlPath = PAGE_EXTENSIONS.has(extension)
                  ? filePathToSlug(filePath)
                  : null;

                // Upsert Blob record before uploading so the queue worker can find it
                await sql`
                  INSERT INTO "Blob" (id, site_id, path, app_path, size, sha, metadata, extension)
                  VALUES (
                    ${generateId()},
                    ${siteId},
                    ${filePath},
                    ${urlPath},
                    ${ghTreeItem.size || 0},
                    ${ghTreeItem.sha},
                    ${null},
                    ${extension}
                  )
                  ON CONFLICT (site_id, path) DO UPDATE SET
                    app_path = EXCLUDED.app_path,
                    size = EXCLUDED.size,
                    sha = EXCLUDED.sha
                `;

                const fileBuffer = await fetchGitHubFileRaw(
                  ghRepository,
                  ghTreeItem.sha,
                  accessToken,
                );
                await uploadFile(
                  storage,
                  siteId,
                  filePath,
                  fileBuffer,
                  extension,
                  publish.id,
                );
              } catch (error) {
                console.error(
                  `Sync file error ${siteId}/${filePath}: ${error.message}`,
                );
                // Ensure a Blob record exists even on failure so the site isn't broken
                await sql`
                  INSERT INTO "Blob" (id, site_id, path, size, sha, metadata)
                  VALUES (${generateId()}, ${siteId}, ${filePath}, 0, '', ${null})
                  ON CONFLICT (site_id, path) DO NOTHING
                `;
              }
            }),
          );
        }),
      ),
    );

    // Step: Determine which files should be deleted
    const fileBatchesToDelete = await step.do(
      'get-file-batches-to-delete',
      async () => {
        const existingBlobs = await sql`
          SELECT path, id FROM "Blob" WHERE site_id = ${siteId}
        `;

        const visiblePaths = new Set(
          gitHubTree.tree
            .filter(
              (item) =>
                item.type !== 'tree' &&
                item.path.startsWith(normalizedRootDir) &&
                isPathVisible(item.path, includes, excludes),
            )
            .map((item) => item.path.replace(normalizedRootDir, '')),
        );

        const toDelete = existingBlobs.filter((b) => !visiblePaths.has(b.path));
        const batches = [];
        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
          batches.push(toDelete.slice(i, i + BATCH_SIZE));
        }
        return batches;
      },
    );

    // Delete file batches from storage, Typesense, and DB
    await Promise.all(
      fileBatchesToDelete.map((batch, index) =>
        step.do(`delete-files-batch-${index}`, async () => {
          const deletedPaths = [];

          await Promise.all(
            batch.map(async (blob) => {
              try {
                await deleteFile(storage, siteId, blob.path);
                deletedPaths.push(blob.path);
              } catch (err) {
                console.error(
                  `Storage deletion failed ${siteId}/${blob.path}: ${err.message}`,
                );
              }
            }),
          );

          if (typesense) {
            await Promise.all(
              batch.map(async (blob) => {
                try {
                  await typesense
                    .collections(siteId)
                    .documents(blob.id)
                    .delete({ ignore_not_found: true });
                } catch (err) {
                  console.error(
                    `Typesense deletion failed ${siteId}/${blob.id}: ${err.message}`,
                  );
                }
              }),
            );
          }

          const ids = batch.map((b) => b.id);
          await sql`DELETE FROM "Blob" WHERE id = ANY(${ids})`;

          const deletedSet = new Set(deletedPaths);
          for (const blob of batch) {
            await sql`
              INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
              VALUES (
                ${generateId()},
                ${publish.id},
                ${blob.path},
                'deleted',
                ${deletedSet.has(blob.path) ? 'success' : 'error'}
              )
            `;
          }

          return deletedPaths;
        }),
      ),
    );

    // Revalidate Next.js cache tags via internal callback
    await step.do('revalidate-tags', async () => {
      if (!this.env.NEXTJS_APP_URL || !this.env.INTERNAL_API_SECRET) return;
      try {
        const resp = await fetch(
          `${this.env.NEXTJS_APP_URL}/api/internal/revalidate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': this.env.INTERNAL_API_SECRET,
            },
            body: JSON.stringify({ tag: siteId }),
          },
        );
        if (!resp.ok) {
          console.error(`Revalidate failed: ${resp.status} for site ${siteId}`);
        }
      } catch (err) {
        console.error(`Revalidate error for site ${siteId}: ${err.message}`);
      }
    });

    // Remove the Publish record if no files were processed
    await step.do('cleanup-empty-publish', async () => {
      const rows = await sql`
        SELECT COUNT(*) as count FROM "PublishFile" WHERE publish_id = ${publish.id}
      `;
      if (Number(rows[0].count) === 0) {
        await sql`DELETE FROM "Publish" WHERE id = ${publish.id}`;
      }
    });
  }
}
