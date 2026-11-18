import { WorkflowEntrypoint } from 'cloudflare:workers';
import { matchLinkTarget } from '@flowershow/core';
import { getPostgresClient } from './clients.js';
import { captureError } from './utils.js';

const MAX_POLL_ATTEMPTS = 360; // 1 hour at 10s intervals
// Instance statuses of a GitHub sync that may still upload files.
const SYNC_RUNNING_STATUSES = [
  'queued',
  'running',
  'waiting',
  'paused',
  'waitingForPause',
];

export class PublishFinalizerWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    // syncInstanceId is set on the GitHub path only.
    const { publishId, siteId, syncInstanceId } = event.payload;

    try {
      const sql = getPostgresClient(this.env);

      // The one-hour timeout counts only polls made while no sync is running:
      // a GitHub sync can wait hours for its rate limit to reset.
      let timedOut = false;
      for (let i = 0, idlePolls = 0; ; i++) {
        // true: done; null: files remain and the sync can still upload them;
        // false: files remain. null stays falsy so that older code, which
        // stored only true/false here, replays it as "not done". `== null`
        // also accepts undefined, in case a stored null comes back as that.
        const state = await step.do(`check-completion-${i}`, async () => {
          const [{ count }] = await sql`
          SELECT COUNT(*) AS count FROM "PublishFile"
          WHERE publish_id = ${publishId} AND status = 'uploading'
        `;
          if (Number(count) === 0) return true;
          if (syncInstanceId && (await isSyncRunning(this.env, syncInstanceId)))
            return null;
          return false;
        });
        if (state === true) break;
        if (state != null && ++idlePolls >= MAX_POLL_ATTEMPTS) {
          timedOut = true;
          break;
        }
        await step.sleep(
          `poll-interval-${i}`,
          state == null ? '1 minute' : '10 seconds',
        );
      }

      await step.do('finalize-publish', () =>
        finalizePublish({ sql, publishId, timedOut }),
      );

      await step.do('resolve-links', async () => {
        const unresolved = await sql`
        SELECT id, target_path FROM "Link"
        WHERE site_id = ${siteId} AND target_blob_id IS NULL
      `;
        if (unresolved.length === 0) return;

        const blobs = /** @type {{ id: string, path: string }[]} */ (
          await sql`
        SELECT id, path, app_path, permalink FROM "Blob"
        WHERE site_id = ${siteId}
      `
        );

        for (const link of unresolved) {
          const match = matchLinkTarget(link.target_path, blobs);
          if (match) {
            await sql`
            UPDATE "Link" SET target_blob_id = ${match.id}
            WHERE id = ${link.id}
          `;
          }
        }
      });

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
              body: JSON.stringify({ tags: [siteId] }),
            },
          );
          if (!resp.ok) {
            console.error(
              `Revalidate failed: ${resp.status} for site ${siteId}`,
            );
          }
        } catch (err) {
          console.error(`Revalidate error for site ${siteId}: ${err.message}`);
        }
      });
    } catch (err) {
      await captureError(this.env, {
        source: 'workflow_publish_finalizer',
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

async function isSyncRunning(env, instanceId) {
  try {
    const instance = await env.GITHUB_SYNC_WORKFLOW.get(instanceId);
    const { status } = await instance.status();
    return SYNC_RUNNING_STATUSES.includes(status);
  } catch {
    // Unknown instance or a lookup failure: count the poll towards the timeout.
    return false;
  }
}

export async function finalizePublish({ sql, publishId, timedOut }) {
  if (timedOut) {
    await sql`
      UPDATE "PublishFile" SET status = 'expired'
      WHERE publish_id = ${publishId} AND status = 'uploading'
    `;
  }
  await sql`
    UPDATE "Publish" SET completed_at = NOW()
    WHERE id = ${publishId} AND completed_at IS NULL
  `;
}
