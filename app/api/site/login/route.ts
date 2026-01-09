import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SITE_ACCESS_COOKIE_NAME } from '@/lib/const';
import { internalSiteSelect } from '@/lib/db/internal';
import { siteKeyBytes } from '@/lib/site-hmac-key';
import prisma from '@/server/db';

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const siteId = String(form.get('siteid') ?? '');
  const password = String(form.get('password') ?? '');

  const site = await prisma.site.findUnique({
    where: {
      id: siteId,
    },
    select: internalSiteSelect, // ⚠️ sensitive data
  });

  if (
    !site ||
    site.privacyMode !== 'PASSWORD' ||
    !site.accessPasswordHash ||
    !site.tokenVersion
  ) {
    return NextResponse.json({ error: 'Invalid site' }, { status: 400 });
  }

  const ok = await bcrypt.compare(password, site.accessPasswordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const secret = await siteKeyBytes(site.id, site.tokenVersion);

  const token = await new SignJWT({ sid: site.id, ver: site.tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(site.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);

  (await cookies()).set({
    name: SITE_ACCESS_COOKIE_NAME(site.id),
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    ...(site.customDomain
      ? { domain: site.customDomain }
      : {
          path: `/@${site.user.username}/${site.projectName}`, // scope to this site segment
        }),
  });

  return NextResponse.json({ success: true });
}
