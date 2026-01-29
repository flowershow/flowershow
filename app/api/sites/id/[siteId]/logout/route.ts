import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SITE_ACCESS_COOKIE_NAME } from '@/lib/const';
import prisma from '@/server/db';

/**
 * POST /api/sites/id/:siteId/logout
 *
 * Log out a visitor from a password-protected site.
 * Clears the site access cookie.
 *
 * No authentication required.
 *
 * Response: { success: true }
 */
export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await props.params;

  const site = await prisma.site.findUnique({
    where: {
      id: siteId,
    },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!site) return NextResponse.json({ success: true }); // nothing to clear

  // must match original attributes (path, sameSite, secure, domain if set)
  (await cookies()).set({
    name: SITE_ACCESS_COOKIE_NAME(site.id),
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0, // delete
    ...(site.customDomain
      ? { domain: site.customDomain }
      : {
          path: `/@${site.user.username}/${site.projectName}`, // scope to this site segment
        }),
  });

  return NextResponse.json({ success: true });
}
