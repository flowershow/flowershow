import { type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { env } from '@/env.mjs';
import { createOwnerCode } from '@/lib/site-owner-code';
import { OWNER_PATHS, safeReturnPath } from '@/lib/site-owner-session';
import { getSiteOwnOrigin, normalizeHost } from '@/lib/site-host';
import { authOptions } from '@/server/auth';
import prisma from '@/server/db';

const NO_STORE = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
};

function cloudOrigin() {
  const secure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  return `${secure ? 'https' : 'http'}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`;
}

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, ...NO_STORE },
  });
}

function text(status: number, body: string) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NO_STORE },
  });
}

/**
 * GET /api/sites/id/:siteId/owner/authorize?return=/path  (cloud host)
 *
 * Step 2 of the owner sign-in handshake. Checks the account session and that
 * the user owns the site, then sends the browser back to the site's own host
 * with a one-time code. The destination is always the site's own origin
 * (never taken from the request), and `return` is reduced to a relative path.
 * Not signed in: go to login, then come back here.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await props.params;
  const returnPath = safeReturnPath(request.nextUrl.searchParams.get('return'));
  const selfPath = `/api/sites/id/${encodeURIComponent(siteId)}/owner/authorize?return=${encodeURIComponent(returnPath)}`;

  // The account session cookie is only on *.flowershow.app; run on the cloud host.
  if (
    normalizeHost(request.headers.get('host')) !==
    normalizeHost(env.NEXT_PUBLIC_CLOUD_DOMAIN)
  ) {
    return redirect(`${cloudOrigin()}${selfPath}`);
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return redirect(
      `${cloudOrigin()}/login?callbackUrl=${encodeURIComponent(selfPath)}`,
    );
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, userId: true, subdomain: true, customDomain: true },
  });
  // Same answer for "no such site" and "not yours": don't confirm site ids.
  if (!site || site.userId !== userId) {
    return text(403, 'You are signed in, but you do not own this site.');
  }
  const origin = getSiteOwnOrigin(site);
  if (!origin) return text(404, 'This site has no address to sign in to.');

  const code = await createOwnerCode(site.id, userId);
  return redirect(
    `${origin}${OWNER_PATHS.callback}?code=${encodeURIComponent(code)}&return=${encodeURIComponent(returnPath)}`,
  );
}
