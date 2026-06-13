import { WorkflowEntrypoint } from 'cloudflare:workers';
import postgres from 'postgres';
import {
  finalizePublishSuccess,
  finalizePublishTimeout,
} from './publish-finalization.js';

function getPostgresClient(env) {
  return postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 2,
    fetch_types: false,
  });
}

export class PublishWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { publishId } = event.payload;

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
