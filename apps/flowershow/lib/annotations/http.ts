import { ANNOTATION_LIMITS } from '@flowershow/api-contract';
import { siteRole, type SiteAuthzFields } from '@/lib/site-authz';
import { after, type NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/lib/cli-auth';
import { siteAccessDenied } from '@/lib/site-auth';
import PostHogClient from '@/lib/server-posthog';
import {
  getSiteManagerFromRequest,
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
 * Site-manager check for routes that are also open to visitors. True only when
 * the caller presented credentials (bearer token or owner cookie) of someone
 * who may manage the site (owner, or editor while Premium); an anonymous
 * caller, or bad credentials, is simply "not a manager".
 */
export async function isSiteManager(
  request: NextRequest,
  siteId: string,
  loadSite: (
    userId: string,
  ) => Promise<({ id: string } & SiteAuthzFields) | null>,
): Promise<boolean> {
  if (
    !request.headers.has('authorization') &&
    !readOwnerCookie(request.headers)
  )
    return false;
  const manager = await authorizeSiteManager(request, siteId, loadSite);
  return !('response' in manager);
}

/**
 * Authenticate someone who may manage the site (owner, or editor while the
 * site is Premium): a CLI/PAT bearer token, or (in the browser, on the site's
 * own host) the site-scoped owner cookie from the owner sign-in handshake.
 * Order is credential, site, role: a bad token never learns whether a site
 * exists. `loadSite` is only called once a credential is valid, with that
 * user's id, so it can filter `members` to them (`siteAuthzSelect(userId)`).
 */
export async function authorizeSiteManager<
  Site extends { id: string } & SiteAuthzFields,
>(
  request: NextRequest,
  siteId: string,
  loadSite: (userId: string) => Promise<Site | null>,
): Promise<{ site: Site; userId: string } | { response: NextResponse }> {
  if (
    !request.headers.has('authorization') &&
    readOwnerCookie(request.headers)
  ) {
    return authorizeSiteManagerCookie(request, siteId, loadSite);
  }
  const auth = await validateAccessToken(request);
  if (!auth?.userId) {
    return {
      response: errorResponse(401, 'unauthorized', 'Not authenticated'),
    };
  }
  const site = await loadSite(auth.userId);
  if (!site)
    return { response: errorResponse(404, 'not_found', 'Site not found') };
  const denied = siteAccessDenied(siteRole(auth.userId, site));
  if (denied) return { response: denied };
  return { site, userId: auth.userId };
}

async function authorizeSiteManagerCookie<
  Site extends { id: string } & SiteAuthzFields,
>(
  request: NextRequest,
  siteId: string,
  loadSite: (userId: string) => Promise<Site | null>,
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
  const loaded: { site: Site | null } = { site: null };
  const userId = await getSiteManagerFromRequest(
    request,
    siteId,
    async (uid) => (loaded.site = await loadSite(uid)),
  );
  if (!loaded.site || !userId) {
    return {
      response: errorResponse(401, 'unauthorized', 'Not authenticated'),
    };
  }
  return { site: loaded.site, userId };
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
