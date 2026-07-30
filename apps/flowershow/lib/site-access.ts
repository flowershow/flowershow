import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { jwtVerify } from 'jose';

import { SITE_ACCESS_COOKIE_NAME } from '@/lib/const';
import { siteKeyBytes } from '@/lib/site-hmac-key';

// Site-access authorization for the visitor-password gate.
type AccessCtx = {
  session: { user?: { id: string } } | null;
  headers: Headers;
};

// The minimal fields hasSiteAccess needs to decide access. Shared by every
// read path that must self-enforce the password gate — the tRPC lookup
// procedures and the /api/* route handlers alike.
export const siteAccessSelect = Prisma.validator<Prisma.SiteSelect>()({
  id: true,
  privacyMode: true,
  tokenVersion: true,
  userId: true,
});

/**
 * Returns true when the caller may access the site. Non-PASSWORD sites, the
 * owner, and holders of a valid site-access cookie all pass. Never throws — use
 * this when you need to branch on access (e.g. narrowing a response) rather than
 * reject the request; see {@link assertSiteAccess} for the throwing variant.
 */
export async function hasSiteAccess(
  site: { privacyMode: string; tokenVersion: number; userId: string } | null,
  siteId: string,
  ctx: AccessCtx,
): Promise<boolean> {
  if (!site || site.privacyMode !== 'PASSWORD') return true;
  if (ctx.session?.user?.id === site.userId) return true;

  const cookieHeader = ctx.headers.get('cookie') ?? '';
  const cookieName = SITE_ACCESS_COOKIE_NAME(siteId);
  let token: string | undefined;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k?.trim() === cookieName) {
      token = v.join('=');
      break;
    }
  }

  if (!token) return false;
  try {
    const secret = await siteKeyBytes(siteId, site.tokenVersion);
    await jwtVerify(token, secret, { audience: siteId });
    return true;
  } catch {
    return false;
  }
}

/**
 * Throws UNAUTHORIZED unless the caller may access a PASSWORD-protected site.
 * Non-PASSWORD sites, the owner, and holders of a valid site-access cookie pass.
 */
export async function assertSiteAccess(
  site: { privacyMode: string; tokenVersion: number; userId: string } | null,
  siteId: string,
  ctx: AccessCtx,
) {
  if (!(await hasSiteAccess(site, siteId, ctx))) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Site access required',
    });
  }
}
