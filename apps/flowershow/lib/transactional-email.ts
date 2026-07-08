import type { ReactElement } from 'react';
import { sendEmail } from '@/lib/email';
import { log, SeverityNumber } from '@/lib/otel-logger';
import PostHogClient from '@/lib/server-posthog';

interface SendTransactionalEmailParams {
  /** Recipient address. */
  to: string;
  subject: string;
  react: ReactElement;
  /** Machine-readable email type, for the PostHog event (e.g. 'renewal_reminder'). */
  type: string;
  /** Owning user id, when known — used as the default PostHog distinctId. */
  userId?: string | null;
  /**
   * Stable idempotency key. Passed straight to Resend, which suppresses a
   * duplicate send under the same key for 24h — so a redelivered webhook becomes
   * a no-op with no first-party bookkeeping. Omit for one-shot emails that can't
   * be redelivered.
   */
  idempotencyKey?: string;
  /** distinctId for the PostHog analytics event. Defaults to userId. */
  distinctId?: string;
  /** Extra properties for the PostHog event. */
  properties?: Record<string, string | number | boolean | null | undefined>;
}

export interface SendTransactionalEmailResult {
  /** True when the send succeeded (or was a Resend-deduped no-op). */
  sent: boolean;
}

/**
 * Send a transactional email without ever throwing.
 *
 * Billing/webhook callers must return 2xx promptly to avoid Stripe retry storms,
 * so a send failure is logged + captured in PostHog rather than propagated.
 * Idempotency is delegated to Resend via `idempotencyKey`; observability is the
 * `transactional_email_sent` PostHog event plus otel logs.
 */
export async function sendTransactionalEmail(
  params: SendTransactionalEmailParams,
): Promise<SendTransactionalEmailResult> {
  const {
    to,
    subject,
    react,
    type,
    userId,
    idempotencyKey,
    distinctId,
    properties,
  } = params;

  try {
    const result = await sendEmail({ to, subject, react, idempotencyKey });
    // Resend surfaces API errors on the `error` field rather than throwing.
    if ((result as { error?: unknown } | undefined)?.error) {
      throw new Error(
        `Resend error: ${JSON.stringify((result as { error?: unknown }).error)}`,
      );
    }

    const posthog = PostHogClient();
    posthog.capture({
      distinctId: distinctId ?? userId ?? 'system',
      event: 'transactional_email_sent',
      properties: { email_type: type, ...properties },
    });
    await posthog.shutdown();

    return { sent: true };
  } catch (err) {
    // Record the failure without blocking the caller.
    log(`Transactional email send failed: ${type}`, SeverityNumber.ERROR, {
      email_type: type,
      userId: userId ?? undefined,
    });

    const posthog = PostHogClient();
    posthog.captureException(err, distinctId ?? userId ?? 'system', {
      context: 'transactional_email',
      email_type: type,
    });
    await posthog.shutdown();

    return { sent: false };
  }
}
