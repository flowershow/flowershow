import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getPostgresClient, getStorageClient, getTypesenseClient } from './clients.js';
import {
  fetchGitHubConfig,
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  getGitHubInstallationToken,
} from './github.js';
import { generateId } from './helpers.js';
import { filePathToSlug, isPathVisible, PAGE_EXTENSIONS } from './path-utils.js';
import { deleteFile, uploadFile } from './storage.js';
import { ensureTypesenseCollection } from './typesense.js';

const BATCH_SIZE = 20;

// Handles both GitHub sync and presigned-path lifecycle ownership.
// instanceId = publishId (set by the /sync or /start-lifecycle handler before creation).
export class PublishWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {
      mode,
      publishId,
      siteId,
      // GitHub-only params
      ghRepository,
      ghBranch,
      rootDir,
      githubInstallationId,
      forceSync = false,
    } = event.payload;

    const sql = getPostgresClient(this.env);

    if (mode === 'github') {
      // Generate a fresh token on every run (outside any step so retries don't reuse
      // a cached expired value — GitHub App installation tokens expire in 1h).
      const accessToken = await getGitHubInstallationToken(
        githubInstallationId,
        this.env,
      );

      const storage = getStorageClient(this.env);
      const typesense = getTypesenseClient(this.env);

      // Verify site exists
      await step.do('fetch-site', async () => {
        const rows = await sql`SELECT id FROM "Site" WHERE id = ${siteId}`;
        if (rows.length === 0) throw new Error(`Site ${siteId} not found.`);
      });

      // Fetch site config (contentInclude / contentExclude)
      const { contentInclude: includes = [], contentExclude: excludes = [] } =
        await step.do('fetch-site-config', async () => {
          return fetchGitHubConfig(ghRepository, ghBranch, accessToken);
        });

      // Ensure Typesense collection exists
      await step.do('check-typesense-collection', async () => {
        await ensureTypesenseCollection(typesense, siteId);
      });

      // Fetch GitHub repo tree
      const gitHubTree = await step.do('fetch-github-tree', async () => {
        return fetchGitHubRepoTree(ghRepository, ghBranch, accessToken);
      });

      const normalizedRootDir = rootDir
        ? `${rootDir.replace(/^(.?\/)+|\/+$/g, '')}/`
        : '';

      // Determine which files need to be upserted
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

      // Determine which files should be deleted
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

      const totalFiles =
        fileBatchesToUpsert.flat().length + fileBatchesToDelete.flat().length;

      if (totalFiles === 0) {
        // Nothing to do — finalize immediately
        await step.do('finalize-empty-publish', async () => {
          await sql`
            UPDATE "Publish" SET status = 'success', completed_at = NOW()
            WHERE id = ${publishId}
          `;
        });
        return;
      }

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

      // Download from GitHub and upload to R2 in batches
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
                    INSERT INTO "Blob" (id, site_id, path, app_path, size, sha, metadata, extension, updated_at)
                    VALUES (
                      ${generateId()},
                      ${siteId},
                      ${filePath},
                      ${urlPath},
                      ${ghTreeItem.size || 0},
                      ${ghTreeItem.sha},
                      ${null},
                      ${extension},
                      NOW()
                    )
                    ON CONFLICT (site_id, path) DO UPDATE SET
                      app_path = EXCLUDED.app_path,
                      size = EXCLUDED.size,
                      sha = EXCLUDED.sha,
                      updated_at = NOW()
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
                    publishId,
                  );
                } catch (error) {
                  console.error(
                    `Sync file error ${siteId}/${filePath}: ${error.message}`,
                  );
                  // Ensure a Blob record exists even on failure
                  await sql`
                    INSERT INTO "Blob" (id, site_id, path, size, sha, metadata, updated_at)
                    VALUES (${generateId()}, ${siteId}, ${filePath}, 0, '', ${null}, NOW())
                    ON CONFLICT (site_id, path) DO NOTHING
                  `;
                }
              }),
            );
          }),
        ),
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
    } // end mode === 'github'

    // Both modes: wait for queue consumer to signal all files are processed.
    // The queue consumer runs the atomic completion check and sends this event.
    const completionEvent = await step.waitForEvent('publish-complete', {
      timeout: '1h',
    });

    // Finalize the publish record
    await step.do('finalize-publish', async () => {
      if (completionEvent === null) {
        // Timeout — mark remaining uploading files as expired
        await sql`
          UPDATE "PublishFile" SET status = 'expired'
          WHERE publish_id = ${publishId} AND status = 'uploading'
        `;
        await sql`
          UPDATE "Publish" SET status = 'error', completed_at = NOW()
          WHERE id = ${publishId} AND status IN ('in_progress', 'finalizing')
        `;
      } else {
        const errorRows = await sql`
          SELECT COUNT(*) as count FROM "PublishFile"
          WHERE publish_id = ${publishId} AND status = 'error'
        `;
        const status = Number(errorRows[0].count) > 0 ? 'error' : 'success';
        await sql`
          UPDATE "Publish" SET status = ${status}, completed_at = NOW()
          WHERE id = ${publishId}
        `;
      }
    });

    // Revalidate Next.js cache tags
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
  }
}
