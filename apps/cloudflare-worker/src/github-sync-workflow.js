import { WorkflowEntrypoint } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';
import { getPostgresClient, getStorageClient } from './clients.js';
import {
  fetchGitHubConfig,
  fetchGitHubFileStream,
  fetchGitHubRepoTree,
  getGitHubInstallationToken,
  GitHubRateLimitError,
} from './github.js';
import {
  deleteFile,
  deleteStoragePrefix,
  readFileBytes,
  uploadFile,
} from './storage.js';
import { captureError, generateId } from './utils.js';

const BATCH_SIZE = 20;
// Same per-file cap as the publish API (MAX_FILE_SIZE in
// apps/flowershow/lib/publish-limits.ts).
const MAX_FILE_BYTES = 100 * 1024 * 1024;
// Storage key segment for site content: `{siteId}/main/raw/{path}`. It is NOT
// the git branch: the app reads every site from `main` regardless of ghBranch.
const STORAGE_BRANCH = 'main';
// The sync plan (files to upsert and delete) lives in storage, not in step
// outputs: a step output is capped at 1 MiB, about 5k files. Its keys are
// `{siteId}/_github-sync/raw/{publishId}/…`, a non-main prefix that the queue
// consumer ignores and site deletion removes.
const PLAN_BRANCH = '_github-sync';
// Batches per stored plan page: 1000 files, about 200 KB of JSON.
const PLAN_PAGE_BATCHES = 50;
// GitHub gives an installation about 5,000 API requests per hour, and the sync
// uses one per file. A batch whose files GitHub refuses for the rate limit
// waits for the reset and tries those files again, at most this many times.
const MAX_RATE_LIMIT_WAITS = 3;

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

    const storage = getStorageClient(this.env);
    const plan = createPlanStore(storage, siteId, publishId);

    try {
      // Generate a fresh token on every run (outside any step so retries don't reuse
      // a cached expired value — GitHub App installation tokens expire in 1h).
      let accessToken = await getGitHubInstallationToken(
        githubInstallationId,
        this.env,
      );

      const sql = getPostgresClient(this.env);

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

      const normalizedRoot = normalizeRootDir(rootDir);

      // Work out which files to upsert and delete, store the batches, and
      // return only their counts.
      const counts = await step.do('plan-sync', async () => {
        const gitHubTree = await fetchGitHubRepoTree(
          ghRepository,
          ghBranch,
          accessToken,
        );
        // GitHub cuts the list at 100,000 entries or 7 MB. Every file missing
        // from a cut list would be deleted from the site.
        if (gitHubTree.truncated) {
          throw new NonRetryableError(
            `GitHub returned only part of the file list of ${ghRepository} (over 100,000 entries or 7 MB). Sync stopped so that no files are deleted from the site.`,
          );
        }
        const existingBlobs = await sql`
          SELECT path, sha FROM "Blob" WHERE site_id = ${siteId}
        `;
        const toUpsert = computeFilesToUpsert(
          existingBlobs,
          gitHubTree,
          normalizedRoot,
          includes,
          excludes,
        ).map(({ ghTreeItem, filePath, changeType }) => ({
          ghSha: ghTreeItem.sha,
          size: ghTreeItem.size,
          filePath,
          changeType,
        }));
        const toDelete = computeFilesToDelete(
          existingBlobs,
          gitHubTree,
          normalizedRoot,
          includes,
          excludes,
        ).map((blob) => blob.path);

        const upsertBatches = createBatches(toUpsert, BATCH_SIZE);
        const deleteBatches = createBatches(toDelete, BATCH_SIZE);
        await plan.write('upsert', upsertBatches);
        await plan.write('delete', deleteBatches);
        return {
          upsertBatches: upsertBatches.length,
          deleteBatches: deleteBatches.length,
        };
      });

      // Create PublishFile rows for all files to upsert, one step per plan page
      const upsertPages = Math.ceil(counts.upsertBatches / PLAN_PAGE_BATCHES);
      for (let page = 0; page < upsertPages; page++) {
        await step.do(`create-publish-files-${page}`, async () => {
          const batches = await plan.readPage('upsert', page);
          for (const { filePath, changeType } of batches.flat()) {
            await sql`
            INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
            VALUES (${generateId()}, ${publishId}, ${filePath}, ${changeType}, 'uploading')
          `;
          }
        });
      }

      // Delete file batches from R2; create terminal PublishFile rows for each deletion.
      // Worker handles Blob/Typesense cleanup via DeleteObject events.
      await Promise.all(
        Array.from({ length: counts.deleteBatches }, (_, index) =>
          step.do(`delete-files-batch-${index}`, async () => {
            const batch = await plan.readBatch('delete', index);
            const deletedPaths = [];

            await Promise.all(
              batch.map(async (path) => {
                try {
                  await deleteFile(storage, siteId, STORAGE_BRANCH, path);
                  deletedPaths.push(path);
                } catch (err) {
                  console.error(
                    `Storage deletion failed ${siteId}/${path}: ${err.message}`,
                  );
                }
              }),
            );

            const deletedSet = new Set(deletedPaths);
            for (const path of batch) {
              await sql`
              INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
              VALUES (
                ${generateId()},
                ${publishId},
                ${path},
                'deleted',
                ${deletedSet.has(path) ? 'success' : 'error'}
              )
            `;
            }

            return deletedPaths;
          }),
        ),
      );

      // Start the finalizer after all PublishFile rows exist. It waits while
      // this sync is still running (rate-limit waits can take hours), then
      // polls until all uploading rows reach a terminal state and finalizes
      // the Publish record. It also handles the zero-files and delete-only cases.
      await step.do('start-publish-finalizer', async () => {
        try {
          await this.env.PUBLISH_FINALIZER_WORKFLOW.create({
            id: publishId,
            params: { publishId, siteId, syncInstanceId: event.instanceId },
          });
        } catch (err) {
          // A reset after create() but before this step's result was stored
          // runs the step again; the instance then exists already.
          await this.env.PUBLISH_FINALIZER_WORKFLOW.get(publishId).catch(() => {
            throw err;
          });
        }
      });

      // Stream each file from GitHub into R2, so no file is held whole in
      // memory. Batches run one after another, files within a batch in parallel.
      for (let index = 0; index < counts.upsertBatches; index++) {
        // Paths to try again after a rate-limit wait; null means the whole batch.
        let retryPaths = null;
        for (let attempt = 0; ; attempt++) {
          const stepName = `process-files-to-upsert-batch-${index}${attempt ? `-retry-${attempt}` : ''}`;
          const refused = await step.do(stepName, async () => {
            const batch = await plan.readBatch('upsert', index);
            const files = retryPaths
              ? batch.filter(({ filePath }) => retryPaths.includes(filePath))
              : batch;
            const refusedPaths = [];
            let resetAt = 0;
            await Promise.all(
              files.map(async ({ ghSha, size, filePath }) => {
                try {
                  if (size > MAX_FILE_BYTES) {
                    throw new Error(
                      `File ${filePath} exceeds maximum size of ${MAX_FILE_BYTES / 1024 / 1024}MB`,
                    );
                  }
                  const stream = await fetchGitHubFileStream(
                    ghRepository,
                    ghSha,
                    accessToken,
                  );
                  await uploadFile(
                    storage,
                    siteId,
                    STORAGE_BRANCH,
                    filePath,
                    stream,
                    size,
                    filePath.split('.').pop() || '',
                    publishId,
                  );
                } catch (error) {
                  if (
                    error instanceof GitHubRateLimitError &&
                    attempt < MAX_RATE_LIMIT_WAITS
                  ) {
                    refusedPaths.push(filePath);
                    resetAt = Math.max(resetAt, error.resetAt);
                    return;
                  }
                  console.error(
                    `Sync file error ${siteId}/${filePath}: ${error.message}`,
                  );
                  // Mark the row terminal so the failure surfaces in the publish
                  // status. Otherwise the upload never produces an R2 event, the
                  // PublishFile row stays 'uploading', and the finalizer polls it
                  // for a full hour before expiring it — a silent failure that
                  // still reports the publish as completed.
                  await sql`
                    UPDATE "PublishFile"
                    SET status = 'error', error = ${error.message}
                    WHERE publish_id = ${publishId} AND path = ${filePath}
                  `;
                }
              }),
            );
            // The wait is worked out inside the step so that a replay sleeps
            // for the same duration: a sleep's identity includes it. One
            // extra second covers clock skew with GitHub.
            return {
              paths: refusedPaths,
              waitMs: Math.max(0, resetAt - Date.now()) + 1000,
            };
          });
          if (refused.paths.length === 0) break;
          console.log(
            `Sync ${siteId}: GitHub rate limit, ${refused.paths.length} files wait ${Math.round(refused.waitMs / 1000)}s`,
          );
          await step.sleep(
            `rate-limit-wait-${index}-${attempt + 1}`,
            refused.waitMs,
          );
          // The first token can expire during a long sync.
          accessToken = await getGitHubInstallationToken(
            githubInstallationId,
            this.env,
          );
          retryPaths = refused.paths;
        }
      }

      await step.do('delete-sync-plan', () => plan.delete());
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

function createBatches(items, batchSize) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/** Sync plan batches, stored as pages of PLAN_PAGE_BATCHES batches. */
function createPlanStore(storage, siteId, publishId) {
  const pagePath = (kind, page) => `${publishId}/${kind}-${page}.json`;
  const readPage = async (kind, page) => {
    const bytes = await readFileBytes(
      storage,
      `${siteId}/${PLAN_BRANCH}/raw/${pagePath(kind, page)}`,
    );
    return JSON.parse(new TextDecoder().decode(bytes));
  };
  return {
    async write(kind, batches) {
      for (let page = 0; page * PLAN_PAGE_BATCHES < batches.length; page++) {
        const start = page * PLAN_PAGE_BATCHES;
        const bytes = new TextEncoder().encode(
          JSON.stringify(batches.slice(start, start + PLAN_PAGE_BATCHES)),
        );
        await uploadFile(
          storage,
          siteId,
          PLAN_BRANCH,
          pagePath(kind, page),
          new Blob([bytes]).stream(),
          bytes.length,
          'json',
        );
      }
    },
    readPage,
    async readBatch(kind, index) {
      const page = await readPage(kind, Math.floor(index / PLAN_PAGE_BATCHES));
      return page[index % PLAN_PAGE_BATCHES];
    },
    delete: () =>
      deleteStoragePrefix(
        storage,
        `${siteId}/${PLAN_BRANCH}/raw/${publishId}/`,
      ),
  };
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
        // Match include/exclude patterns against the site-relative path (rootDir
        // stripped) — users write patterns relative to their site root ("/notes"),
        // not the repo root ("<rootDir>/notes").
        isPathVisible(
          item.path.replace(normalizedRootDir, ''),
          includes,
          excludes,
        ),
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
          // See computeFilesToUpsert: match patterns against the site-relative path.
          isPathVisible(
            item.path.replace(normalizedRootDir, ''),
            includes,
            excludes,
          ),
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
