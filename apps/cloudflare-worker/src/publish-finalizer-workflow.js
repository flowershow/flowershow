import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getPostgresClient } from './clients.js';

const MAX_POLL_ATTEMPTS = 360; // 1 hour at 10s intervals

export class PublishFinalizerWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { publishId, siteId } = event.payload;

    const sql = getPostgresClient(this.env);

    let timedOut = false;
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      const done = await step.do(`check-completion-${i}`, async () => {
        const [{ count }] = await sql`
          SELECT COUNT(*) AS count FROM "PublishFile"
          WHERE publish_id = ${publishId} AND status = 'uploading'
        `;
        return Number(count) === 0;
      });
      if (done) break;
      if (i === MAX_POLL_ATTEMPTS - 1) {
        timedOut = true;
      } else {
        await step.sleep(`poll-interval-${i}`, '10 seconds');
      }
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

      const blobs = await sql`
        SELECT id, path, app_path, permalink FROM "Blob"
        WHERE site_id = ${siteId}
      `;

      for (const link of unresolved) {
        const target = link.target_path;
        const match = blobs.find(
          (b) =>
            b.permalink === target ||
            b.app_path === target ||
            b.path === target ||
            b.path.endsWith(`/${target}`) ||
            b.path.endsWith(`/${target}.md`) ||
            b.path.endsWith(`/${target}.mdx`),
        );
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
          console.error(`Revalidate failed: ${resp.status} for site ${siteId}`);
        }
      } catch (err) {
        console.error(`Revalidate error for site ${siteId}: ${err.message}`);
      }
    });
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
