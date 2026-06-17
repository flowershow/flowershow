import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { SITE_ACCESS_COOKIE_NAME } from '@/lib/const';
import { fetchFile, generatePresignedGetUrl } from '@/lib/content-store';
import { siteKeyBytes } from '@/lib/site-hmac-key';
import prisma from '@/server/db';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']);

export async function GET(
  req: NextRequest,
  props: {
    params: Promise<{
      username: string;
      projectName: string;
      path?: string[];
    }>;
  },
) {
  const params = await props.params;
  const { username, projectName, path } = params;

  if (!path || path.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const site =
    username === '_domain'
      ? await prisma.site.findFirst({
          where: { customDomain: projectName },
          select: { id: true, privacyMode: true, tokenVersion: true },
        })
      : await prisma.site.findFirst({
          where: { projectName, user: { username } },
          select: { id: true, privacyMode: true, tokenVersion: true },
        });

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rawPath = path.join('/');
  const r2Key = `${site.id}/main/raw/${rawPath}`;

  const ext = rawPath.slice(rawPath.lastIndexOf('.') + 1).toLowerCase();
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const isHtml = ext === 'html';

  // Non-image files on password-protected sites require a valid session cookie.
  // Images are exempt so the Next.js image optimizer (server-side, no cookie) still works.
  if (site.privacyMode === 'PASSWORD' && !isImage) {
    const cookie = req.cookies.get(SITE_ACCESS_COOKIE_NAME(site.id));
    if (!cookie || !site.tokenVersion) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const secret = await siteKeyBytes(site.id, site.tokenVersion);
      await jwtVerify(cookie.value, secret, { audience: site.id });
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // HTML files: proxy content so the browser renders rather than downloads.
  if (isHtml) {
    try {
      const content = await fetchFile({
        projectId: site.id,
        path: rawPath,
      });
      if (!content) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return new NextResponse(content, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  // Password-protected sites: short-lived presigned URL.
  // Images: presigned URL replaces cookie auth for the image optimizer.
  // Non-images: cookie already verified above; presigned URL still limits URL sharing.
  if (site.privacyMode === 'PASSWORD') {
    const signedUrl = await generatePresignedGetUrl(r2Key, 300); // 5 minutes
    return NextResponse.redirect(signedUrl, 302);
  }

  // Public sites: redirect to the R2 public domain (CDN-cached at edge).
  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';
  const publicUrl = `${protocol}://${env.NEXT_PUBLIC_S3_BUCKET_DOMAIN}/${site.id}/main/raw/${encodedPath}`;

  return NextResponse.redirect(publicUrl, 302);
}
