import { after, type NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';

export function errorResponse(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

/** 400 for a body that failed its contract schema. */
export function invalidBodyResponse(
  error: { message: string },
  message: string,
) {
  return NextResponse.json(
    { error: 'bad_request', error_description: error.message, message },
    { status: 400 },
  );
}

/**
 * Authenticate the CLI/PAT token and check it belongs to the site's owner.
 * Order is token, site, owner: a bad token never learns whether a site exists.
 * `loadSite` is only called once the token is valid.
 */
export async function authorizeOwner<Site extends { userId: string }>(
  request: NextRequest,
  loadSite: () => Promise<Site | null>,
): Promise<{ site: Site; userId: string } | { response: NextResponse }> {
  const auth = await validateAccessToken(request);
  if (!auth?.userId) {
    return {
      response: errorResponse(401, 'unauthorized', 'Not authenticated'),
    };
  }
  const site = await loadSite();
  if (!site)
    return { response: errorResponse(404, 'not_found', 'Site not found') };
  if (site.userId !== auth.userId) {
    return {
      response: errorResponse(
        403,
        'forbidden',
        'You do not have access to this site',
      ),
    };
  }
  return { site, userId: auth.userId };
}

/**
 * Send an analytics event after the response, so it never slows or breaks the
 * request. Never pass note text, names or any visitor identifier.
 */
export function track(
  distinctId: string,
  event: string,
  properties: Record<string, unknown>,
) {
  after(async () => {
    const posthog = PostHogClient();
    posthog.capture({ distinctId, event, properties });
    await posthog.shutdown();
  });
}
