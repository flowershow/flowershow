import { WorkflowEntrypoint } from 'cloudflare:workers';
import {
  getPostgresClient,
  getStorageClient,
  getTypesenseClient,
} from './clients.js';
import {
  convertDocument,
  indexConvertedDocument,
  recordConversionFailure,
  settleSupersededConversion,
} from './converted-document.js';
import { DocxRejectedError } from './docx/convert.js';

const RETRY = {
  retries: { limit: 2, delay: '5 seconds', backoff: 'exponential' },
};

/**
 * Converts one uploaded Word document (one version: `sha`) to a page. Started
 * by the queue consumer with id hash(siteId, path, sha), so each version is
 * converted once, in its own invocation, away from the shared queue batch.
 *
 * payload: { siteId, path, sha, size, publishId }
 */
export class DocConversionWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { siteId, path, sha, size, publishId } = event.payload;
    const env = this.env;
    const storage = getStorageClient(env);
    const sql = getPostgresClient(env);
    const typesense = getTypesenseClient(env);
    const fail = (name, error) =>
      step.do(name, () =>
        recordConversionFailure({
          sql,
          env,
          siteId,
          path,
          sha,
          size,
          publishId,
          error,
        }),
      );

    let result;
    try {
      result = await step.do('convert', RETRY, async () => {
        try {
          return await convertDocument({ storage, siteId, path, sha });
        } catch (err) {
          // A document we cannot convert will not convert on retry either.
          if (err instanceof DocxRejectedError)
            return { rejected: err.message };
          throw err;
        }
      });

      if (result.superseded) {
        await step.do('settle-superseded', () =>
          settleSupersededConversion({ sql, env, siteId, path, publishId }),
        );
        return;
      }
      if (result.rejected) {
        await fail('record-rejected', result.rejected);
        return;
      }

      await step.do('index', RETRY, () =>
        indexConvertedDocument({
          storage,
          sql,
          typesense,
          env,
          siteId,
          path,
          sha,
          size,
          publishId,
          warnings: result.warnings,
        }),
      );
    } catch (err) {
      // Retries are used up: report it, and leave the file downloadable.
      await fail('record-failure', err);
    }
  }
}
