import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getPostgresClient } from './clients.js';

export class PublishFinalizerWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { publishId, siteId } = event.payload;

    const sql = getPostgresClient(this.env);

    // Wait for queue consumer to signal all files are processed.
    // The queue consumer runs the atomic completion check and sends this event.
    // For GitHub publishes, GitHubSyncWorkflow sends this event directly when there
    // are zero files to process.
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
