import { ANNOTATION_LIMITS } from '@flowershow/api-contract';
import { canManageSite } from '@/lib/site-authz';
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
 * Read a small JSON request body: JSON content type only (text/plain and form
 * posts reach a cross-site page without a preflight), capped at
 * ANNOTATION_LIMITS.bodyBytes. Returns the parsed value (null if it isn't
 * JSON, left for the schema to reject) or an error response.
 */
export async function readJsonBody(
  request: NextRequest,
  tooLargeMessage: string,
): Promise<{ json: unknown } | { response: NextResponse }> {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    return {
      response: errorResponse(415, 'unsupported_media_type', 'Send JSON'),
    };
  const tooLarge = {
    response: errorResponse(413, 'payload_too_large', tooLargeMessage),
  };
  if (
    Number(request.headers.get('content-length')) > ANNOTATION_LIMITS.bodyBytes
  )
    return tooLarge;
  const text = await request.text();
  if (Buffer.byteLength(text) > ANNOTATION_LIMITS.bodyBytes) return tooLarge;
  try {
    return { json: JSON.parse(text) };
  } catch {
    return { json: null };
  }
}

/**
 * Site-owner check for routes that are also open to visitors. True only when
 * the caller presented owner credentials (bearer token or owner cookie) that
 * pass; an anonymous caller, or bad credentials, is simply "not the owner".
 */
export async function isSiteOwner<Site extends { id: string; userId: string }>(
  request: NextRequest,
  site: Site,
): Promise<boolean> {
  if (
    !request.headers.has('authorization') &&
    !readOwnerCookie(request.headers)
  )
    return false;
  const owner = await authorizeOwner(request, async () => site);
  return !('response' in owner);
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
  if (!canManageSite(auth.userId, site)) {
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
