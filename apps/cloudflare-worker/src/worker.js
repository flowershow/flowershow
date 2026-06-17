import { getPostgresClient, getStorageClient, getTypesenseClient, validateEnv } from './clients.js';
import { generateId } from './helpers.js';
import { handleMessage } from './message-handler.js';
import { PublishWorkflow } from './publish-workflow.js';
import { cleanupExpiredSites } from './storage.js';

export { PublishWorkflow };

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

      const { siteId, ghRepository, ghBranch, rootDir, githubInstallationId, forceSync, gitCommitSha, gitCommitMessage } = body;
      if (!siteId || !ghRepository || !ghBranch || !githubInstallationId) {
        return new Response('Missing required fields: siteId, ghRepository, ghBranch, githubInstallationId', { status: 400 });
      }

      const sql = getPostgresClient(env);
      let publishId;
      try {
        publishId = generateId();

        // Create the Publish record before starting the workflow so instanceId = publishId
        await sql`
          INSERT INTO "Publish" (id, site_id, source, status, started_at, git_commit_sha, git_commit_message)
          VALUES (${publishId}, ${siteId}, 'github_webhook', 'in_progress', NOW(), ${gitCommitSha ?? null}, ${gitCommitMessage ?? null})
        `;

        // Supersede any in-progress GitHub publishes for this site
        const previous = await sql`
          SELECT id FROM "Publish"
          WHERE site_id = ${siteId}
            AND id != ${publishId}
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
            const prevInstance = await env.PUBLISH_WORKFLOW.get(prev.id);
            await prevInstance.terminate();
          } catch (termErr) {
            console.error(`Failed to terminate workflow ${prev.id}: ${termErr.message}`);
          }
        }
      } finally {
        await sql.end();
      }

      const instance = await env.PUBLISH_WORKFLOW.create({
        id: publishId,
        params: { mode: 'github', publishId, siteId, ghRepository, ghBranch, rootDir: rootDir ?? null, githubInstallationId, forceSync: forceSync ?? false, gitCommitSha: gitCommitSha ?? null, gitCommitMessage: gitCommitMessage ?? null },
      });

      return Response.json({ instanceId: instance.id }, { status: 202 });
    }

    if (request.method === 'POST' && url.pathname === '/start-lifecycle') {
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
        return new Response('Missing required fields: publishId, siteId', { status: 400 });
      }

      const instance = await env.PUBLISH_WORKFLOW.create({
        id: publishId,
        params: { mode: 'presigned', publishId, siteId },
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
