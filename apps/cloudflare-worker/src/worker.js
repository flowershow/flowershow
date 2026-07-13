import {
  getPostgresClient,
  getStorageClient,
  getTypesenseClient,
  validateEnv,
} from './clients.js';
import { GitHubSyncWorkflow } from './github-sync-workflow.js';
import { PublishFinalizerWorkflow } from './publish-finalizer-workflow.js';
import { handleMessage } from './queue-consumer.js';
import { deleteSiteStorage } from './storage.js';
import { captureError, generateId } from './utils.js';

export { GitHubSyncWorkflow, PublishFinalizerWorkflow };

export default {
  // HTTP endpoint (health + dev adapter + sync trigger)
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    try {
      validateEnv(env);

      // Trigger GitHub sync workflow
      if (request.method === 'POST' && url.pathname === '/sync') {
        const authHeader = request.headers.get('Authorization');
        const expectedToken = `Bearer ${env.SYNC_TRIGGER_SECRET}`;
        if (!env.SYNC_TRIGGER_SECRET || authHeader !== expectedToken) {
          return new Response('Unauthorized', { status: 401 });
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }

        const {
          siteId,
          ghRepository,
          ghBranch,
          rootDir,
          githubInstallationId,
          gitCommitSha,
          gitCommitMessage,
        } = body;
        if (!siteId || !ghRepository || !ghBranch || !githubInstallationId) {
          return new Response(
            'Missing required fields: siteId, ghRepository, ghBranch, githubInstallationId',
            { status: 400 },
          );
        }

        const sql = getPostgresClient(env);

        let publishId;
        try {
          publishId = generateId();

          // Cancel all uploading files from prior in-progress publishes for this site.
          // Their finalizers will detect completion on the next poll and set completedAt.
          const previous = await sql`
            SELECT id FROM "Publish"
            WHERE site_id = ${siteId}
              AND completed_at IS NULL
            ORDER BY started_at DESC
          `;

          for (const prev of previous) {
            await sql`
              UPDATE "PublishFile" SET status = 'canceled'
              WHERE publish_id = ${prev.id} AND status = 'uploading'
            `;
            // Terminate the GitHub sync workflow — no value in continuing to process an old tree.
            try {
              const prevSync = await env.GITHUB_SYNC_WORKFLOW.get(
                `${prev.id}-github`,
              );
              await prevSync.terminate();
            } catch (termErr) {
              console.error(
                `Failed to terminate sync workflow ${prev.id}: ${termErr.message}`,
              );
            }
          }
        } finally {
          await sql.end();
        }

        const syncInstance = await env.GITHUB_SYNC_WORKFLOW.create({
          id: `${publishId}-github`,
          params: {
            publishId,
            siteId,
            ghRepository,
            ghBranch,
            rootDir: rootDir ?? null,
            githubInstallationId,
            gitCommitSha: gitCommitSha ?? null,
            gitCommitMessage: gitCommitMessage ?? null,
          },
        });

        return Response.json({ instanceId: syncInstance.id }, { status: 202 });
      }

      // Start finalizer workflow
      if (request.method === 'POST' && url.pathname === '/start-finalizer') {
        const authHeader = request.headers.get('Authorization');
        const expectedToken = `Bearer ${env.SYNC_TRIGGER_SECRET}`;
        if (!env.SYNC_TRIGGER_SECRET || authHeader !== expectedToken) {
          return new Response('Unauthorized', { status: 401 });
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }

        const { publishId, siteId } = body;
        if (!publishId || !siteId) {
          return new Response('Missing required fields: publishId, siteId', {
            status: 400,
          });
        }

        const instance = await env.PUBLISH_FINALIZER_WORKFLOW.create({
          id: publishId,
          params: { publishId, siteId },
        });

        return Response.json({ instanceId: instance.id }, { status: 202 });
      }

      // Dev adapter for S3 events from Minio
      if (env.ENVIRONMENT === 'dev' && url.pathname === '/queue') {
        let event;
        try {
          event = await request.json();
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }
        const record = event.Records?.[0];
        const rawKey = record?.s3?.object?.key;
        if (!rawKey) {
          return new Response('Bad S3 event', { status: 400 });
        }
        // Spaces in object keys from Minio are encoded as +
        const decodedKey = decodeURIComponent(rawKey.replace(/\+/g, ' '));
        const isDelete = record?.eventName?.startsWith('s3:ObjectRemoved');
        await env.FILE_PROCESSOR_QUEUE.send({
          ...(isDelete ? { action: 'DeleteObject' } : {}),
          object: { key: decodedKey },
        });
        return new Response('Queued', { status: 200 });
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response('OK', { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    } catch (err) {
      await captureError(env, {
        source: 'worker_fetch',
        method: request.method,
        path: url.pathname,
        error_message: err?.message,
        error_name: err?.name,
        error_stack: err?.stack,
      });
      throw err;
    }
  },

  // Cron triggers
  async scheduled(controller, env, _ctx) {
    try {
      validateEnv(env);
      if (controller.cron === '0 3 * * *') {
        const sql = getPostgresClient(env);
        try {
          const storage = getStorageClient(env);
          const typesense = getTypesenseClient(env);
          await cleanupExpiredSites({ sql, storage, typesense });
        } finally {
          await sql.end();
        }
      }
    } catch (err) {
      await captureError(env, {
        source: 'worker_scheduled',
        cron: controller.cron,
        error_message: err?.message,
        error_name: err?.name,
        error_stack: err?.stack,
      });
      throw err;
    }
  },

  // Queue consumer entry point
  async queue(batch, env, _ctx) {
    try {
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
    } catch (err) {
      await captureError(env, {
        source: 'worker_queue',
        queue: batch.queue,
        error_message: err?.message,
        error_name: err?.name,
        error_stack: err?.stack,
      });
      throw err;
    }
  },
};

async function cleanupExpiredSites({ sql, storage, typesense }) {
  const expiredSites = await sql`
    SELECT id FROM "Site"
    WHERE is_temporary = true
      AND expires_at <= NOW()
  `;

  if (expiredSites.length === 0) {
    console.log('cleanupExpiredSites: no expired sites');
    return;
  }

  console.log(`cleanupExpiredSites: deleting ${expiredSites.length} sites`);

  for (const site of expiredSites) {
    try {
      await sql`DELETE FROM "Site" WHERE id = ${site.id}`;
      await deleteSiteStorage(storage, site.id);
      if (typesense) {
        try {
          await typesense.collections(`${site.id}`).delete();
        } catch (err) {
          if (err?.httpStatus !== 404) {
            console.error(
              `Failed to delete Typesense collection ${site.id}:`,
              err.message,
            );
          }
        }
      }
      console.log(`cleanupExpiredSites: deleted site ${site.id}`);
    } catch (err) {
      console.error(
        `cleanupExpiredSites: failed for site ${site.id}:`,
        err.message,
      );
    }
  }
}
