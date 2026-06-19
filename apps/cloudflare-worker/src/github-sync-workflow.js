import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getPostgresClient, getStorageClient, getTypesenseClient } from './clients.js';
import {
  fetchGitHubConfig,
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  getGitHubInstallationToken,
} from './github.js';
import { generateId } from './helpers.js';
import { deleteFile, uploadFile } from './storage.js';
import {
  computeFilesToDelete,
  computeFilesToUpsert,
  createBatches,
  normalizeRootDir,
} from './workflow-utils.js';

const BATCH_SIZE = 20;

export class GitHubSyncWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {
      publishId,
      siteId,
      ghRepository,
      ghBranch,
      rootDir,
      githubInstallationId,
      forceSync = false,
      gitCommitSha = null,
      gitCommitMessage = null,
    } = event.payload;

    // Generate a fresh token on every run (outside any step so retries don't reuse
    // a cached expired value — GitHub App installation tokens expire in 1h).
    const accessToken = await getGitHubInstallationToken(
      githubInstallationId,
      this.env,
    );

    const sql = getPostgresClient(this.env);
    const storage = getStorageClient(this.env);
    const typesense = getTypesenseClient(this.env);

    // Verify site exists
    await step.do('fetch-site', async () => {
      const rows = await sql`SELECT id FROM "Site" WHERE id = ${siteId}`;
      if (rows.length === 0) throw new Error(`Site ${siteId} not found.`);
    });

    // Create the Publish record as the first durable step
    await step.do('create-publish-record', async () => {
      await sql`
        INSERT INTO "Publish" (id, site_id, source, status, started_at, git_commit_sha, git_commit_message)
        VALUES (${publishId}, ${siteId}, 'github_webhook', 'in_progress', NOW(), ${gitCommitSha}, ${gitCommitMessage})
      `;
    });

    // Fetch site config (contentInclude / contentExclude)
    const { contentInclude: includes = [], contentExclude: excludes = [] } =
      await step.do('fetch-site-config', async () => {
        return fetchGitHubConfig(ghRepository, ghBranch, accessToken);
      });

    // Fetch GitHub repo tree
    const gitHubTree = await step.do('fetch-github-tree', async () => {
      return fetchGitHubRepoTree(ghRepository, ghBranch, accessToken);
    });

    const normalizedRoot = normalizeRootDir(rootDir);

    // Determine which files need to be upserted
    const fileBatchesToUpsert = await step.do(
      'get-file-batches-to-upsert',
      async () => {
        const existingBlobs = await sql`
          SELECT path, sha FROM "Blob" WHERE site_id = ${siteId}
        `;
        const items = computeFilesToUpsert(existingBlobs, gitHubTree, normalizedRoot, includes, excludes, forceSync);
        return createBatches(items, BATCH_SIZE);
      },
    );

    // Determine which files should be deleted
    const fileBatchesToDelete = await step.do(
      'get-file-batches-to-delete',
      async () => {
        const existingBlobs = await sql`
          SELECT path FROM "Blob" WHERE site_id = ${siteId}
        `;
        const toDelete = computeFilesToDelete(existingBlobs, gitHubTree, normalizedRoot, includes, excludes);
        return createBatches(toDelete, BATCH_SIZE);
      },
    );

    // Create PublishFile rows for all files to upsert
    await step.do('create-publish-files-for-upsert', async () => {
      const allItems = fileBatchesToUpsert.flat();
      if (allItems.length === 0) return;
      for (const { filePath, changeType } of allItems) {
        await sql`
          INSERT INTO "PublishFile" (id, publish_id, path, change_type, status)
          VALUES (${generateId()}, ${publishId}, ${filePath}, ${changeType}, 'uploading')
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
                await deleteFile(storage, siteId, blob.path);
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

    // Download from GitHub and upload to R2 in batches
    await Promise.all(
      fileBatchesToUpsert.map((batch, index) =>
        step.do(`process-files-to-upsert-batch-${index}`, async () => {
          await Promise.all(
            batch.map(async ({ ghTreeItem, filePath }) => {
              try {
                const extension = ghTreeItem.path.split('.').pop() || '';
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
                  publishId,
                );
              } catch (error) {
                console.error(
                  `Sync file error ${siteId}/${filePath}: ${error.message}`,
                );
              }
            }),
          );
        }),
      ),
    );
  }
}
