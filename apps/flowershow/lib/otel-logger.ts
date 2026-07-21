import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';

// Determine PostHog region from host
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const logsUrl = posthogHost.includes('us.i.posthog.com')
  ? 'https://us.i.posthog.com/i/v1/logs'
  : 'https://eu.i.posthog.com/i/v1/logs';

export const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({ 'service.name': 'flowershow' }),
  processors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: logsUrl,
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_POSTHOG_KEY}`,
          'Content-Type': 'application/json',
        },
      }),
    ),
  ],
});

const logger = loggerProvider.getLogger('flowershow');

export { SeverityNumber };

/**
 * Emit a structured log record to PostHog via OpenTelemetry.
 */
export function log(
  body: string,
  severity: SeverityNumber,
  attributes?: Record<string, string | number | boolean | undefined>,
) {
  // Filter out undefined values from attributes
  const cleanAttrs: Record<string, string | number | boolean> = {};
  if (attributes) {
    for (const [k, v] of Object.entries(attributes)) {
      if (v !== undefined) {
        cleanAttrs[k] = v;
      }
    }
  }

  logger.emit({
    body,
    severityNumber: severity,
    attributes: cleanAttrs,
  });
}

/**
 * Force-export any buffered log records.
 *
 * The BatchLogRecordProcessor buffers records and exports them on an interval.
 * On serverless platforms (Vercel) the function is frozen/killed immediately
 * after the response is returned, so any batch that hasn't hit its export tick
 * is silently dropped. Await this at the end of a request — alongside
 * `posthog.shutdown()` — to guarantee logs are shipped before teardown.
 *
 * Best-effort: never throws, so it can't mask the real response during teardown.
 */
export async function flushLogs(): Promise<void> {
  try {
    await loggerProvider.forceFlush();
  } catch {
    // Swallow — telemetry flushing must not break the request lifecycle.
  }
}
