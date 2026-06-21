import {
  getPostgresClient,
  getStorageClient,
  getTypesenseClient,
  validateEnv,
} from './clients.js';
import { GitHubSyncWorkflow } from './github-sync-workflow.js';
import { PublishFinalizerWorkflow } from './publish-finalizer-workflow.js';
import { handleMessage } from './queue-consumer.js';
import { generateId } from './utils.js';

export { GitHubSyncWorkflow, PublishFinalizerWorkflow };

export default {
  // HTTP endpoint (health + dev adapter + sync trigger)
  async fetch(request, env, _ctx) {
    validateEnv(env);
    const url = new URL(request.url);

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

      // TODO is this the right place to create
      let publishId;
      try {
        publishId = generateId();

        // Supersede any in-progress GitHub publishes for this site
        const previous = await sql`
          SELECT id FROM "Publish"
          WHERE site_id = ${siteId}
            AND status = 'in_progress'
            AND source = 'github_webhook'
          ORDER BY started_at DESC
        `;

        for (const prev of previous) {
          await sql`
            UPDATE "PublishFile" SET status = 'canceled'
            WHERE publish_id = ${prev.id} AND status = 'uploading'
          `;
          await sql`
            UPDATE "Publish" SET status = 'superseded', completed_at = NOW()
            WHERE id = ${prev.id} AND status = 'in_progress'
          `;
          try {
            const prevFinalizer = await env.PUBLISH_FINALIZER_WORKFLOW.get(
              prev.id,
            );
            await prevFinalizer.terminate();
          } catch (termErr) {
            console.error(
              `Failed to terminate finalizer workflow ${prev.id}: ${termErr.message}`,
            );
          }
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

      // Publish record creation and finalizer start are handled inside the workflow
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

    if (request.method === 'POST' && url.pathname === '/terminate-finalizer') {
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

      const { publishIds } = body;
      if (!Array.isArray(publishIds)) {
        return new Response('Missing required field: publishIds', {
          status: 400,
        });
      }

      for (const pid of publishIds) {
        try {
          const instance = await env.PUBLISH_FINALIZER_WORKFLOW.get(pid);
          await instance.terminate();
        } catch (termErr) {
          console.error(
            `Failed to terminate finalizer workflow ${pid}: ${termErr.message}`,
          );
        }
      }

      return new Response(null, { status: 204 });
    }

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

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  },

  // Cron triggers
  async scheduled(controller, env, _ctx) {
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
