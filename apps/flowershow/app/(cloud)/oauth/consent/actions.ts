'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { decideAuthorization } from '@/lib/oauth/authorize';
import { oauthEnabled } from '@/lib/oauth/config';
import PostHogClient from '@/lib/server-posthog';
import { getSession } from '@/server/auth';

export type ConsentState = { error: string } | null;

/**
 * Same-origin check, as in /api/sites/claim: the session cookie is
 * SameSite=Lax on .flowershow.app, so require the POST to come from this
 * origin (Next also checks Origin against Host for server actions).
 */
async function sameOrigin(): Promise<boolean> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const origin = h.get('origin');
  const fetchSite = h.get('sec-fetch-site');
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {}
  return origin
    ? originHost === host && (!fetchSite || fetchSite === 'same-origin')
    : fetchSite === 'same-origin';
}

/** Allow / Cancel on the consent page. */
export async function decideConsent(
  _prev: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  if (!oauthEnabled()) return { error: 'Not available.' };
  if (!(await sameOrigin())) return { error: 'Cross-origin request refused.' };
  const session = await getSession();
  if (!session?.user?.id)
    return { error: 'Your session has ended. Sign in again.' };

  const decision = formData.get('decision') === 'allow' ? 'allow' : 'deny';
  const outcome = await decideAuthorization(
    formData.get('req'),
    session.user.id,
    decision,
  );
  if (!outcome.ok) return { error: outcome.message };

  if (outcome.newGrant) {
    const posthog = PostHogClient();
    posthog.capture({
      distinctId: session.user.id,
      event: 'mcp_oauth_grant_created',
      properties: { grant_id: outcome.grantId },
    });
    await posthog.shutdown();
  }
  redirect(outcome.location);
}
