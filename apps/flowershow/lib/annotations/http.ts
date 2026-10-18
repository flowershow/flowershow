import { after, type NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';
import {
  getSiteOwnerFromRequest,
  isSameOriginRequest,
  readOwnerCookie,
} from '@/lib/site-owner-session';

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
 * Authenticate the site owner: a CLI/PAT bearer token, or (in the browser, on
 * the site's own host) the site-scoped owner cookie from the owner sign-in
 * handshake. Order is credential, site, owner: a bad token never learns
 * whether a site exists. `loadSite` is only called once a credential is present.
 */
export async function authorizeOwner<
  Site extends { id: string; userId: string },
>(
  request: NextRequest,
  loadSite: () => Promise<Site | null>,
): Promise<{ site: Site; userId: string } | { response: NextResponse }> {
  if (
    !request.headers.has('authorization') &&
    readOwnerCookie(request.headers)
  ) {
    return authorizeOwnerCookie(request, loadSite);
  }
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

async function authorizeOwnerCookie<
  Site extends { id: string; userId: string },
>(
  request: NextRequest,
  loadSite: () => Promise<Site | null>,
): Promise<{ site: Site; userId: string } | { response: NextResponse }> {
  // Cookies ride along on requests from sibling *.flowershow.me sites (same
  // site, so SameSite=Lax doesn't help): writes must come from this origin.
  if (
    request.method !== 'GET' &&
    request.method !== 'HEAD' &&
    !isSameOriginRequest(request)
  ) {
    return {
      response: errorResponse(403, 'forbidden', 'Cross-origin request'),
    };
  }
  const site = await loadSite();
  const userId = site ? await getSiteOwnerFromRequest(request, site) : null;
  if (!site || !userId) {
    return {
      response: errorResponse(401, 'unauthorized', 'Not authenticated'),
    };
  }
  return { site, userId };
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
