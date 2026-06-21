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
    await sql`
      UPDATE "Publish" SET status = 'error', completed_at = NOW()
      WHERE id = ${publishId} AND status = 'in_progress'
    `;
    return;
  }

  const [{ total, canceled, errors }] = await sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'canceled') AS canceled,
      COUNT(*) FILTER (WHERE status = 'error') AS errors
    FROM "PublishFile"
    WHERE publish_id = ${publishId}
  `;

  let status;
  if (Number(total) > 0 && Number(canceled) === Number(total)) {
    status = 'superseded';
  } else if (Number(errors) > 0) {
    status = 'error';
  } else {
    status = 'success';
  }

  await sql`
    UPDATE "Publish" SET status = ${status}, completed_at = NOW()
    WHERE id = ${publishId}
  `;
}
