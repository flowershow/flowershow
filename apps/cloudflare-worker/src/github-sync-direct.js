import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { Client as TypesenseClient } from 'typesense';
import {
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  getGitHubInstallationToken,
  githubJsonFetch,
} from './github-api.js';
import { computeFilesToDelete, computeFilesToUpsert } from './github-sync.js';
import {
  createPublishFilesUploading,
  createTerminalPublishFilesForDeletions,
  deleteBlobsByPath,
  getBlobPaths,
  getBlobShaMap,
  getGitHubInstallationId,
  upsertBlob,
} from './github-sync-sql.js';
import { cancelSupersededGithubPublish } from './publish-supersession.js';
import { checkPublishCompletion } from './publish-completion.js';
import { finalizePublishSuccess } from './publish-finalization.js';

const BATCH_SIZE = 20;

function getPostgresClient(env) {
  return postgres(env.DATABASE_URL, { max: 1, idle_timeout: 2, fetch_types: false });
}

function getS3Client(env) {
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    region: env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

async function ensureTypesenseCollection(env, siteId) {
  if (!env.TYPESENSE_API_KEY || !env.TYPESENSE_HOST) return;
  const typesense = new TypesenseClient({
    nodes: [{ host: env.TYPESENSE_HOST, port: Number.parseInt(env.TYPESENSE_PORT, 10), protocol: env.TYPESENSE_PROTOCOL }],
    apiKey: env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 2,
  });
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
    if (err?.httpStatus !== 409) console.warn('[github-sync-direct] Typesense collection error:', err.message);
  }
}

/**
 * Run GithubSyncWorkflow steps directly, without the Cloudflare Workflow engine.
 * Used as a dev fallback when GITHUB_SYNC_WORKFLOW.create fails (e.g. miniflare limitation).
 *
 * Files are uploaded to S3/MinIO instead of R2. MinIO event notifications trigger
 * the queue consumer, which calls notifyWorkflowIfComplete → finalizePublishSuccess.
 */
export async function runGithubSyncDirect(params, env) {
  const {
    publishId,
    siteId,
    installationDbId,
    ghRepository,
    ghBranch,
    rootDir = '',
    forceSync = false,
  } = params;

  console.log(`[github-sync-direct] publishId=${publishId} siteId=${siteId} repo=${ghRepository}`);

  const sql = getPostgresClient(env);

  try {
    // Step 1: supersede prior in-flight GitHub syncs for this site
    const affectedPublishIds = await cancelSupersededGithubPublish(sql, siteId, publishId);
    for (const priorId of affectedPublishIds) {
      const won = await checkPublishCompletion(sql, priorId);
      if (won) await finalizePublishSuccess(sql, priorId);
    }

    // Step 2: ensure Typesense collection exists
    await ensureTypesenseCollection(env, siteId);

    // Step 3: get a fresh GitHub installation token
    const githubInstallationId = await getGitHubInstallationId(sql, installationDbId);
    const token = await getGitHubInstallationToken(
      githubInstallationId,
      env.GITHUB_APP_ID,
      env.GITHUB_APP_PRIVATE_KEY,
    );

    // Step 4: fetch site config (includes/excludes) from GitHub
    const { contentInclude: includes = [], contentExclude: excludes = [] } = await (async () => {
      try {
        const config = await githubJsonFetch(
          `/repos/${ghRepository}/contents/config.json?ref=${encodeURIComponent(ghBranch)}`,
          token,
        );
        return JSON.parse(atob(config.content));
      } catch {
        return {};
      }
    })();

    // Step 4b: fetch GitHub tree + compute diff
    const gitHubTree = await fetchGitHubRepoTree(ghRepository, ghBranch, token);
    const [blobShaMap, existingPaths] = await Promise.all([
      getBlobShaMap(sql, siteId),
      getBlobPaths(sql, siteId),
    ]);

    const toUpsert = computeFilesToUpsert({ tree: gitHubTree.tree, blobShaMap, rootDir, includes, excludes, forceSync });
    const toDelete = computeFilesToDelete({ tree: gitHubTree.tree, existingPaths, rootDir, includes, excludes });

    // Step 6: no changes — delete the empty Publish record and exit
    if (toUpsert.length === 0 && toDelete.length === 0) {
      await sql`DELETE FROM "Publish" WHERE id = ${publishId}`;
      console.log(`[github-sync-direct] No changes for ${publishId} — deleted empty publish`);
      return;
    }

    // Step 7: create all PublishFile rows upfront with status=uploading
    await createPublishFilesUploading(sql, publishId, toUpsert);

    const s3 = getS3Client(env);

    // Step 8: upsert Blob records + upload files to S3/MinIO
    // MinIO event notifications will trigger the queue consumer per file.
    const upsertBatches = [];
    for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
      upsertBatches.push(toUpsert.slice(i, i + BATCH_SIZE));
    }

    for (const batch of upsertBatches) {
      await Promise.all(
        batch.map(async ({ filePath, sha, size, appPath, extension }) => {
          await upsertBlob(sql, siteId, { path: filePath, sha, size, appPath, extension });
          const fileBytes = await fetchGitHubFileRaw(ghRepository, sha, token);
          const key = `${siteId}/main/raw/${filePath}`;
          await s3.send(
            new PutObjectCommand({
              Bucket: env.S3_BUCKET,
              Key: key,
              Body: fileBytes,
              Metadata: { 'publish-id': publishId },
            }),
          );
        }),
      );
    }

    // Step 9: handle deletions
    const deleteBatches = [];
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      deleteBatches.push(toDelete.slice(i, i + BATCH_SIZE));
    }

    for (const batch of deleteBatches) {
      const deleted = [];
      const failed = [];
      await Promise.all(
        batch.map(async (path) => {
          try {
            await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: `${siteId}/main/raw/${path}` }));
            deleted.push(path);
          } catch {
            failed.push(path);
          }
        }),
      );
      await deleteBlobsByPath(sql, siteId, deleted);
      await createTerminalPublishFilesForDeletions(sql, publishId, { deleted, failed });
    }

    // Step 10: if uploads-only sync, finalize immediately
    if (toUpsert.length === 0) {
      const won = await checkPublishCompletion(sql, publishId);
      if (won) await finalizePublishSuccess(sql, publishId);
      return;
    }

    console.log(`[github-sync-direct] Uploaded ${toUpsert.length} file(s) for ${publishId}; queue consumer will finalize`);
    // Queue consumer → notifyWorkflowIfComplete → finalizePublishSuccess fallback handles the rest.
  } catch (err) {
    console.error(`[github-sync-direct] Error for publishId=${publishId}:`, err);
    try {
      await sql`UPDATE "Publish" SET status = 'error' WHERE id = ${publishId} AND status IN ('in_progress', 'finalizing')`;
    } catch {}
  } finally {
    await sql.end();
  }
}
