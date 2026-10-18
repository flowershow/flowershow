import { after } from 'next/server';
import PostHogClient from '@/lib/server-posthog';

export type OAuthEvent =
  | 'mcp_oauth_grant_created'
  | 'mcp_oauth_grant_refreshed'
  | 'mcp_oauth_grant_revoked';

/**
 * Send a PostHog event after the response, so the OAuth endpoints don't wait
 * on analytics. Outside a request scope (unit tests) it is dropped.
 */
export function captureOAuthEvent(
  userId: string,
  event: OAuthEvent,
  properties: Record<string, unknown> = {},
): void {
  try {
    after(async () => {
      const posthog = PostHogClient();
      posthog.capture({ distinctId: userId, event, properties });
      await posthog.shutdown();
    });
  } catch {}
}
