import { WorkflowEntrypoint } from 'cloudflare:workers';
import postgres from 'postgres';
import { Client as TypesenseClient } from 'typesense';
import { checkPublishCompletion } from './publish-completion.js';
import {
  finalizePublishSuccess,
  finalizePublishTimeout,
} from './publish-finalization.js';
import {
  fetchGitHubFileRaw,
  fetchGitHubRepoTree,
  getGitHubInstallationToken,
  githubJsonFetch,
} from './github-api.js';
import {
  computeFilesToDelete,
  computeFilesToUpsert,
} from './github-sync.js';
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

const BATCH_SIZE = 20;

// Step-count guard: at batch size 20, ~1024 steps accommodates ~400 files
// (upsert + delete) with headroom for fixed steps. Log a warning near the limit.
const MAX_UPSERT_BATCHES = 400;

function getPostgresClient(env) {
  return postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 2,
    fetch_types: false,
  });
}

function getTypesenseClient(env) {
  if (!env.TYPESENSE_API_KEY || !env.TYPESENSE_HOST) return null;
  return new TypesenseClient({
    nodes: [{ host: env.TYPESENSE_HOST, port: Number.parseInt(env.TYPESENSE_PORT, 10), protocol: env.TYPESENSE_PROTOCOL }],
    apiKey: env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 2,
  });
}

async function ensureTypesenseCollection(typesense, siteId) {
  if (!typesense) return;
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

// ─── Presigned-path Workflow (CLI, Obsidian, dashboard, anonymous) ────────────

export class PublishWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { publishId, siteId } = event.payload;

    await step.do('ensure-typesense-collection', async () => {
      await ensureTypesenseCollection(getTypesenseClient(this.env), siteId);
    });

    const result = await step.waitForEvent('publish-complete', {
      type: 'publish-complete',
      timeout: '1h',
    });

    if (result !== null) {
      await step.do('finalize-success', async () => {
        const sql = getPostgresClient(this.env);
        try {
          await finalizePublishSuccess(sql, publishId);
        } finally {
          await sql.end();
        }
      });
    } else {
      await step.do('finalize-timeout', async () => {
        const sql = getPostgresClient(this.env);
        try {
          await finalizePublishTimeout(sql, publishId);
        } finally {
          await sql.end();
        }
      });
    }
  }
}

// ─── GitHub Sync Workflow ─────────────────────────────────────────────────────

/**
 * Payload shape (triggered from the GitHub webhook handler):
 * {
 *   publishId:        string   // pre-created Publish record CUID
 *   siteId:           string
 *   installationDbId: string   // GitHubInstallation.id (CUID) — not the GitHub bigint
 *   ghRepository:     string   // "owner/repo"
 *   ghBranch:         string
 *   rootDir?:         string
 *   forceSync?:       boolean
 *   gitCommitSha?:    string
 * }
 */
export class GithubSyncWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {
      publishId,
      siteId,
      installationDbId,
      ghRepository,
      ghBranch,
      rootDir = '',
      forceSync = false,
    } = event.payload;

    // ── Step 1: supersede any prior in-flight GitHub syncs for this site ──────
    const affectedPublishIds = await step.do('supersede-prior-publishes', async () => {
      const sql = getPostgresClient(this.env);
      try {
        return cancelSupersededGithubPublish(sql, siteId, publishId);
      } finally {
        await sql.end();
      }
    });

    // Finalize any superseded publishes that are now fully terminal
    if (affectedPublishIds.length > 0) {
      await step.do('finalize-superseded-publishes', async () => {
        const sql = getPostgresClient(this.env);
        try {
          for (const priorId of affectedPublishIds) {
            const won = await checkPublishCompletion(sql, priorId);
            if (won && this.env.PUBLISH_WORKFLOW) {
              const instance = await this.env.PUBLISH_WORKFLOW.get(priorId);
              await instance.sendEvent({ type: 'publish-complete', payload: {} });
            }
          }
        } finally {
          await sql.end();
        }
      });
    }

    // ── Step 2: ensure Typesense collection exists ────────────────────────────
    await step.do('ensure-typesense-collection', async () => {
      await ensureTypesenseCollection(getTypesenseClient(this.env), siteId);
    });

    // ── Step 3: get a fresh installation token ────────────────────────────────
    const token = await step.do('get-installation-token', async () => {
      const sql = getPostgresClient(this.env);
      try {
        const githubInstallationId = await getGitHubInstallationId(sql, installationDbId);
        return getGitHubInstallationToken(
          githubInstallationId,
          this.env.GITHUB_APP_ID,
          this.env.GITHUB_APP_PRIVATE_KEY,
        );
      } finally {
        await sql.end();
      }
    });

    // ── Step 4: fetch site config (includes/excludes) from GitHub ─────────────
    const { contentInclude: includes = [], contentExclude: excludes = [] } =
      await step.do('fetch-site-config', async () => {
        try {
          const config = await githubJsonFetch(
            `/repos/${ghRepository}/contents/config.json?ref=${encodeURIComponent(ghBranch)}`,
            token,
          );
          return JSON.parse(atob(config.content));
        } catch {
          return {};
        }
      });

    // ── Step 4: fetch GitHub tree + compute diff ──────────────────────────────
    const { toUpsert, toDelete } = await step.do('compute-diff', async () => {
      const gitHubTree = await fetchGitHubRepoTree(ghRepository, ghBranch, token);

      const sql = getPostgresClient(this.env);
      try {
        const [blobShaMap, existingPaths] = await Promise.all([
          getBlobShaMap(sql, siteId),
          getBlobPaths(sql, siteId),
        ]);

        const toUpsert = computeFilesToUpsert({
          tree: gitHubTree.tree,
          blobShaMap,
          rootDir,
          includes,
          excludes,
          forceSync,
        });

        const toDelete = computeFilesToDelete({
          tree: gitHubTree.tree,
          existingPaths,
          rootDir,
          includes,
          excludes,
        });

        return { toUpsert, toDelete };
      } finally {
        await sql.end();
      }
    });

    // ── Step 5: guard against step-count limit ────────────────────────────────
    const upsertBatches = [];
    for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
      upsertBatches.push(toUpsert.slice(i, i + BATCH_SIZE));
    }
    const deleteBatches = [];
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      deleteBatches.push(toDelete.slice(i, i + BATCH_SIZE));
    }

    if (upsertBatches.length > MAX_UPSERT_BATCHES) {
      console.warn(
        `[GithubSyncWorkflow] publishId=${publishId} has ${upsertBatches.length} upsert batches — ` +
          `approaching ~1024 step limit. Consider reducing batch size or splitting syncs.`,
      );
    }

    // ── Step 6: no changes — clean up empty publish and exit ─────────────────
    if (toUpsert.length === 0 && toDelete.length === 0) {
      await step.do('cleanup-empty-publish', async () => {
        const sql = getPostgresClient(this.env);
        try {
          await sql`DELETE FROM "Publish" WHERE id = ${publishId}`;
        } finally {
          await sql.end();
        }
      });
      return;
    }

    // ── Step 7: create all PublishFile rows upfront ───────────────────────────
    await step.do('create-publish-files', async () => {
      const sql = getPostgresClient(this.env);
      try {
        await createPublishFilesUploading(sql, publishId, toUpsert);
      } finally {
        await sql.end();
      }
    });

    // ── Step 8: process upsert batches (upsert Blob → upload to R2) ──────────
    for (let i = 0; i < upsertBatches.length; i++) {
      const batch = upsertBatches[i];
      await step.do(`process-upsert-batch-${i}`, async () => {
        const sql = getPostgresClient(this.env);
        try {
          await Promise.all(
            batch.map(async ({ filePath, sha, size, appPath, extension }) => {
              // Upsert Blob before uploading so the Queue consumer finds the record
              await upsertBlob(sql, siteId, { path: filePath, sha, size, appPath, extension });

              const fileBytes = await fetchGitHubFileRaw(ghRepository, sha, token);

              const key = `${siteId}/main/raw/${filePath}`;
              await this.env.BUCKET.put(key, fileBytes, {
                customMetadata: { 'publish-id': publishId },
              });
            }),
          );
        } finally {
          await sql.end();
        }
      });
    }

    // ── Step 9: handle deletions ──────────────────────────────────────────────
    for (let i = 0; i < deleteBatches.length; i++) {
      const batch = deleteBatches[i];
      await step.do(`delete-batch-${i}`, async () => {
        const deleted = [];
        const failed = [];

        await Promise.all(
          batch.map(async (path) => {
            try {
              await this.env.BUCKET.delete(`${siteId}/main/raw/${path}`);
              deleted.push(path);
            } catch {
              failed.push(path);
            }
          }),
        );

        const sql = getPostgresClient(this.env);
        try {
          await deleteBlobsByPath(sql, siteId, deleted);
          await createTerminalPublishFilesForDeletions(sql, publishId, { deleted, failed });
        } finally {
          await sql.end();
        }
      });
    }

    // ── Step 10: if no uploads, finalize immediately (deletions only) ─────────
    if (toUpsert.length === 0) {
      await step.do('finalize-deletions-only', async () => {
        const sql = getPostgresClient(this.env);
        try {
          const won = await checkPublishCompletion(sql, publishId);
          if (won) await finalizePublishSuccess(sql, publishId);
        } finally {
          await sql.end();
        }
      });
      return;
    }

    // ── Step 11: wait for Queue consumer to finish processing uploaded files ──
    const result = await step.waitForEvent('publish-complete', {
      type: 'publish-complete',
      timeout: '1h',
    });

    if (result !== null) {
      await step.do('finalize-success', async () => {
        const sql = getPostgresClient(this.env);
        try {
          await finalizePublishSuccess(sql, publishId);
        } finally {
          await sql.end();
        }
      });
    } else {
      await step.do('finalize-timeout', async () => {
        const sql = getPostgresClient(this.env);
        try {
          await finalizePublishTimeout(sql, publishId);
        } finally {
          await sql.end();
        }
      });
    }
  }
}
