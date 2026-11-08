import { canManageSite, siteAuthzSelect } from '@/lib/site-authz';
import { type NextRequest } from 'next/server';
import { consumeOwnerCode } from '@/lib/site-owner-code';
import {
  OWNER_PATHS,
  ownerCookieAttributes,
  ownerCookieName,
  safeReturnPath,
  signOwnerToken,
} from '@/lib/site-owner-session';
import { isSiteOwnHost } from '@/lib/site-host';
import prisma from '@/server/db';

const NO_STORE = {
  'Cache-Control': 'no-store',
  // The code is in this URL; keep it out of Referer headers.
  'Referrer-Policy': 'no-referrer',
};

function serializeCookie(name: string, value: string, maxAge: number) {
  const attrs = ownerCookieAttributes(maxAge);
  return [
    `${name}=${value}`,
    `Path=${attrs.path}`,
    `Max-Age=${attrs.maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(attrs.secure ? ['Secure'] : []),
  ].join('; ');
}

function failed(returnPath: string) {
  const retry = `${OWNER_PATHS.signin}?return=${encodeURIComponent(returnPath)}`;
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Sign-in link expired</title>` +
      `<p>This owner sign-in link has expired or was already used.</p>` +
      `<p><a href="${retry.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">Try again</a></p>`,
    {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE },
    },
  );
}

/**
 * GET /_flowershow/owner/callback?code=&return=  (site host; middleware
 * rewrites it here with the host's own site id)
 *
 * Step 3 of the owner sign-in handshake: redeem the one-time code and set the
 * site-scoped owner cookie on this host only.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await props.params;
  const params = request.nextUrl.searchParams;
  const returnPath = safeReturnPath(params.get('return'));
  const host = request.headers.get('host') ?? '';

  const hostSite = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, subdomain: true, customDomain: true },
  });
  // Only ever set the cookie on the site's own host.
  if (!hostSite || !isSiteOwnHost(host, hostSite)) return failed(returnPath);

  const userId = await consumeOwnerCode(params.get('code'), hostSite.id);
  if (!userId) return failed(returnPath);
  // The code proves who signed in; they must still manage the site now
  // (owner, or editor while Premium): removal or a lapse since authorize fails.
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, ...siteAuthzSelect(userId) },
  });
  if (!site || !canManageSite(userId, site)) return failed(returnPath);

  const token = await signOwnerToken({ siteId: site.id, userId, host });
  return new Response(null, {
    status: 303,
    headers: {
      // Relative: stays on this host whatever `return` said.
      Location: returnPath,
      'Set-Cookie': serializeCookie(
        ownerCookieName(),
        token,
        ownerCookieAttributes().maxAge,
      ),
      ...NO_STORE,
    },
  });
}
