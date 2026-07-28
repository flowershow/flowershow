import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getPostgresClient, getStorageClient } from './clients.js';
import {
  fetchGitHubConfig,
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  getGitHubInstallationToken,
} from './github.js';
import { deleteFile, uploadFile } from './storage.js';
import { captureError, generateId } from './utils.js';

const BATCH_SIZE = 20;

// Upper bound on a single file we will sync. Streaming keeps memory independent
// of file size, so this is not a memory ceiling — it is a product/safety
// boundary: GitHub itself blocks pushes over 100 MB (without LFS), so files at
// or beyond this are pathological. Oversized files are recorded as failed
// (never uploaded) so they surface as a clear error instead of a silent gap.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export class GitHubSyncWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {
      publishId,
      siteId,
      ghRepository,
      ghBranch,
      rootDir,
      githubInstallationId,
      gitCommitSha = null,
      gitCommitMessage = null,
    } = event.payload;

    try {
      // Generate a fresh token on every run (outside any step so retries don't reuse
      // a cached expired value — GitHub App installation tokens expire in 1h).
      const accessToken = await getGitHubInstallationToken(
        githubInstallationId,
        this.env,
      );

      const sql = getPostgresClient(this.env);
      const storage = getStorageClient(this.env);

      // Verify site exists
      await step.do('fetch-site', async () => {
        const rows = await sql`SELECT id FROM "Site" WHERE id = ${siteId}`;
        if (rows.length === 0) throw new Error(`Site ${siteId} not found.`);
      });

      // Create the Publish record
      await step.do('create-publish-record', async () => {
        await sql`
        INSERT INTO "Publish" (id, site_id, source, started_at, git_commit_sha, git_commit_message)
        VALUES (${publishId}, ${siteId}, 'github_webhook', NOW(), ${gitCommitSha}, ${gitCommitMessage})
      `;
      });

      // Fetch site config (contentInclude / contentExclude)
      const { contentInclude: includes = [], contentExclude: excludes = [] } =
        await step.do('fetch-site-config', async () => {
          return fetchGitHubConfig(
            ghRepository,
            ghBranch,
            accessToken,
            rootDir,
          );
        });

      // Fetch GitHub repo tree — strip to only the fields used downstream (path,
      // type, sha, size) to stay within the Workflows 1 MiB step-output limit.
      const gitHubTree = await step.do('fetch-github-tree', async () => {
        const full = await fetchGitHubRepoTree(
          ghRepository,
          ghBranch,
          accessToken,
        );
        return {
          tree: full.tree.map(({ path, type, sha, size }) => ({
            path,
            type,
            sha,
            size,
          })),
        };
      });

      const normalizedRoot = normalizeRootDir(rootDir);

      // Determine which files need to be upserted — store only the fields used
      // during processing (ghPath/ghSha for download, filePath/changeType for DB,
      // ghSize for the guard) to keep step output small. Files over
      // MAX_UPLOAD_BYTES are split out and never downloaded/uploaded.
      const { fileBatchesToUpsert, oversizedFiles } = await step.do(
        'get-file-batches-to-upsert',
        async () => {
          const existingBlobs = await sql`
          SELECT path, sha FROM "Blob" WHERE site_id = ${siteId}
        `;
          const items = computeFilesToUpsert(
            existingBlobs,
            gitHubTree,
            normalizedRoot,
            includes,
            excludes,
          );
          const mapped = items.map(({ ghTreeItem, filePath, changeType }) => ({
            ghPath: ghTreeItem.path,
            ghSha: ghTreeItem.sha,
            ghSize: ghTreeItem.size ?? null,
            filePath,
            changeType,
          }));
          const { withinLimit, oversized } = partitionBySize(
            mapped,
            MAX_UPLOAD_BYTES,
          );
          return {
            fileBatchesToUpsert: createBatches(withinLimit, BATCH_SIZE),
            oversizedFiles: oversized,
          };
        },
      );

      // Determine which files should be deleted
      const fileBatchesToDelete = await step.do(
        'get-file-batches-to-delete',
        async () => {
          const existingBlobs = await sql`
          SELECT path FROM "Blob" WHERE site_id = ${siteId}
        `;
          const toDelete = computeFilesToDelete(
            existingBlobs,
            gitHubTree,
            normalizedRoot,
            includes,
            excludes,
          );
          return createBatches(toDelete, BATCH_SIZE);
        },
      );

      // Create PublishFile rows: files to upload start as 'uploading'; oversized
      // files that were skipped are recorded as terminal 'error' rows up front so
      // the finalizer never waits on them and the failure is visible.
      await step.do('create-publish-files-for-upsert', async () => {
        const allItems = fileBatchesToUpsert.flat();
        for (const { filePath, changeType } of allItems) {
          await sql`
          INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
          VALUES (${generateId()}, ${publishId}, ${filePath}, ${changeType}, 'uploading')
        `;
        }
        for (const { filePath, changeType, ghSize } of oversizedFiles) {
          console.error(
            `Skipping oversized file ${siteId}/${filePath}: ${ghSize} bytes exceeds ${MAX_UPLOAD_BYTES}`,
          );
          await sql`
          INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
          VALUES (${generateId()}, ${publishId}, ${filePath}, ${changeType}, 'error')
        `;
        }
      });

      // Delete file batches from R2; create terminal PublishFile rows for each deletion.
      // Worker handles Blob/Typesense cleanup via DeleteObject events.
      await Promise.all(
        fileBatchesToDelete.map((batch, index) =>
          step.do(`delete-files-batch-${index}`, async () => {
            const deletedPaths = [];

            await Promise.all(
              batch.map(async (blob) => {
                try {
                  await deleteFile(storage, siteId, ghBranch, blob.path);
                  deletedPaths.push(blob.path);
                } catch (err) {
                  console.error(
                    `Storage deletion failed ${siteId}/${blob.path}: ${err.message}`,
                  );
                }
              }),
            );

            const deletedSet = new Set(deletedPaths);
            for (const blob of batch) {
              await sql`
              INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
              VALUES (
                ${generateId()},
                ${publishId},
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

      // Start the finalizer after all PublishFile rows exist (uploading + terminal).
      // The finalizer polls until all uploading rows reach a terminal state, then
      // finalizes the Publish record. It naturally handles the zero-files and
      // delete-only cases without any special signaling.
      await step.do('start-publish-finalizer', async () => {
        await this.env.PUBLISH_FINALIZER_WORKFLOW.create({
          id: publishId,
          params: { publishId, siteId },
        });
      });

      // Download from GitHub and upload to R2 in batches. Streaming (below)
      // keeps per-file memory bounded regardless of size, so batches no longer
      // exist to cap memory — they run SEQUENTIALLY (not via Promise.all) to cap
      // the number of concurrent GitHub fetches and R2 puts in flight to
      // ~BATCH_SIZE, staying within subrequest/connection limits and avoiding
      // GitHub secondary rate limits. Files within a batch still stream in
      // parallel.
      for (let index = 0; index < fileBatchesToUpsert.length; index++) {
        const batch = fileBatchesToUpsert[index];
        await step.do(`process-files-to-upsert-batch-${index}`, async () => {
          await Promise.all(
            batch.map(async ({ ghPath, ghSha, filePath }) => {
              try {
                const extension = ghPath.split('.').pop() || '';
                // Stream GitHub → R2 without buffering the whole file.
                const resp = await fetchGitHubFileRaw(
                  ghRepository,
                  ghSha,
                  accessToken,
                );
                await uploadFile(
                  storage,
                  siteId,
                  ghBranch,
                  filePath,
                  resp.body,
                  extension,
                  publishId,
                );
              } catch (error) {
                console.error(
                  `Sync file error ${siteId}/${filePath}: ${error.message}`,
                );
              }
            }),
          );
        });
      }
    } catch (err) {
      await captureError(this.env, {
        source: 'workflow_github_sync',
        siteId,
        publishId,
        error_message: err?.message,
        error_name: err?.name,
        error_stack: err?.stack,
      });
      throw err;
    }
  }
}

function normalizeRootDir(rootDir) {
  return rootDir ? `${rootDir.replace(/^(.?\/)+|\/+$/g, '')}/` : '';
}

/**
 * Splits mapped upsert items into those within the size limit and those over it.
 * Items with an unknown size (ghSize == null) are always kept — we only skip a
 * file when we have a concrete byte count that exceeds maxBytes.
 */
export function partitionBySize(items, maxBytes) {
  const withinLimit = [];
  const oversized = [];
  for (const item of items) {
    if (item.ghSize != null && item.ghSize > maxBytes) {
      oversized.push(item);
    } else {
      withinLimit.push(item);
    }
  }
  return { withinLimit, oversized };
}

function createBatches(items, batchSize) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Computes which files from the GitHub tree need to be upserted.
 * Returns items with { ghTreeItem, filePath, changeType }.
 */
export function computeFilesToUpsert(
  existingBlobs,
  gitHubTree,
  normalizedRootDir,
  includes,
  excludes,
) {
  const blobShaMap = new Map(existingBlobs.map((b) => [b.path, b.sha]));

  return gitHubTree.tree
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
        !blobShaMap.has(filePath) ||
        blobShaMap.get(filePath) !== ghTreeItem.sha,
    );
}

/**
 * Computes which existing blobs are no longer in the GitHub tree and should be deleted.
 * Returns an array of blob objects from existingBlobs.
 */
export function computeFilesToDelete(
  existingBlobs,
  gitHubTree,
  normalizedRootDir,
  includes,
  excludes,
) {
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

  return existingBlobs.filter((b) => !visiblePaths.has(b.path));
}

function isPathVisible(p, includes, excludes) {
  const normalized = normalizeUrlPath(p);
  if (normalized === '/config.json' || normalized === '/custom.css')
    return true;
  if (isPathIncluded(p, excludes)) return false;
  if (isPathIncluded(p, includes)) return true;
  return !includes[0];
}

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
