import { hashIp } from '@/lib/anon-rate-limit';
import { hitFixedWindow } from '@/lib/fixed-window-limit';
import { accountResource, oauthEnabled } from '@/lib/oauth/config';
import PostHogClient from '@/lib/server-posthog';
import { platformForIp } from './platform-ips';

/**
 * Per-caller limits for anonymous publishing through MCP (flowershow-tl0).
 * Layered, all hourly:
 *
 * 1. per caller: ChatGPT's anonymized user id (`_meta["openai/subject"]`),
 *    else the MCP session id we hand out on initialize (lib/mcp/http.ts);
 * 2. per IP, except for the chat platforms' published egress ranges, whose
 *    IPs are shared by all their users (lib/mcp/platform-ips.ts);
 * 3. the global MCP bucket (MCP_ANON_HOURLY_LIMIT, lib/mcp/deps.ts) as a
 *    backstop, with an alert when it runs out.
 *
 * Updates of an existing anonymous site (siteId + claimToken) are limited
 * per site.
 */

const HOUR_MS = 60 * 60 * 1000;

export const MCP_ANON_LIMITS = {
  /** New anonymous sites per caller (user or MCP session) per hour. */
  perCaller: 10,
  /** New anonymous sites per non-platform IP per hour (same as the CLI). */
  perIp: 10,
  /** Publishes to one anonymous site per hour. */
  perSiteUpdates: 60,
} as const;

/** Who is calling the anonymous MCP endpoint, as far as we can tell. */
export type AnonCaller = {
  ip: string;
  /** `openai:<subject>` or `session:<Mcp-Session-Id>`; null when the client sends neither. */
  callerId: string | null;
};

const MAX_ID_LENGTH = 256;

/** Pick the caller identity from the request headers and JSON-RPC body. */
export function anonCallerFrom(
  ip: string,
  headers: Headers,
  body: unknown,
): AnonCaller {
  const meta = (body as { params?: { _meta?: Record<string, unknown> } })
    ?.params?._meta;
  const subject = meta?.['openai/subject'];
  const session = headers.get('mcp-session-id');
  const callerId =
    typeof subject === 'string' && subject && subject.length <= MAX_ID_LENGTH
      ? `openai:${subject}`
      : session && session.length <= MAX_ID_LENGTH
        ? `session:${session}`
        : null;
  return { ip, callerId };
}

/** "Sign in for higher limits" pointer at the signed-in connector. */
export function signInHint(): string {
  return oauthEnabled()
    ? `Sign in for higher limits: add ${accountResource()} as a connector (it publishes into a free Flowershow account).`
    : 'Publish from a Flowershow account for higher limits.';
}

/**
 * Count a new anonymous site against the caller's per-caller and per-IP
 * buckets. Returns which bucket refused it, or null when within limits.
 */
export async function checkAnonCreateLimits(
  caller: AnonCaller,
  now = new Date(),
): Promise<'caller' | 'ip' | null> {
  if (caller.callerId) {
    const count = await hitFixedWindow(
      `mcp-anon-caller:${hashIp(caller.callerId)}`,
      HOUR_MS,
      now,
    );
    if (count > MCP_ANON_LIMITS.perCaller) return 'caller';
  }
  if (!platformForIp(caller.ip, now.getTime())) {
    const count = await hitFixedWindow(
      `mcp-anon-ip:${hashIp(caller.ip)}`,
      HOUR_MS,
      now,
    );
    if (count > MCP_ANON_LIMITS.perIp) return 'ip';
  }
  return null;
}

/** Count one publish to an anonymous site; false when over the limit. */
export async function checkAnonUpdateLimit(
  siteId: string,
  now = new Date(),
): Promise<boolean> {
  const count = await hitFixedWindow(`mcp-anon-site:${siteId}`, HOUR_MS, now);
  return count <= MCP_ANON_LIMITS.perSiteUpdates;
}

/**
 * The global MCP bucket ran out: every anonymous MCP user is now refused.
 * Send one PostHog event per hour (the first refusal), so it can alert.
 */
export async function reportGlobalLimitReached(
  limit: number,
  now = new Date(),
): Promise<void> {
  console.warn(`MCP anonymous global limit (${limit}/hour) reached`);
  const count = await hitFixedWindow('mcp-anon-global-alert', HOUR_MS, now);
  if (count !== 1) return;
  const posthog = PostHogClient();
  posthog.capture({
    distinctId: 'mcp-anonymous',
    event: 'mcp_anon_global_limit_reached',
    properties: { limit },
  });
  await posthog.shutdown();
}
