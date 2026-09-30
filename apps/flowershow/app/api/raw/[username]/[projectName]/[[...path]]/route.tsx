import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { fetchFile, generatePresignedGetUrl } from '@/lib/content-store';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';
import { hasSiteAccess, siteAccessSelect } from '@/lib/site-access';
import prisma from '@/server/db';

const rawSiteSelect = {
  ...siteAccessSelect,
  isTemporary: true,
  expiresAt: true,
} as const;

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
          select: rawSiteSelect,
        })
      : await prisma.site.findFirst({
          where: { projectName, user: { username } },
          select: rawSiteSelect,
        });

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Expired anonymous sites stop being served before the cleanup cron runs.
  if (site.isTemporary && site.expiresAt && site.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Anonymous sites are never indexed (pages and raw files).
  const robotsHeaders: Record<string, string> =
    site.userId === ANONYMOUS_USER_ID ? { 'X-Robots-Tag': 'noindex' } : {};

  const rawPath = path.join('/');
  const r2Key = `${site.id}/main/raw/${rawPath}`;

  const ext = rawPath.slice(rawPath.lastIndexOf('.') + 1).toLowerCase();
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const isHtml = ext === 'html';

  // Non-image files on password-protected sites require a valid access cookie.
  // Images are exempt so the Next.js image optimizer (server-side, no cookie) still works.
  if (site.privacyMode === 'PASSWORD' && !isImage) {
    const allowed = await hasSiteAccess(site, site.id, {
      session: null,
      headers: req.headers,
    });
    if (!allowed) {
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
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...robotsHeaders,
        },
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
    const signedRes = NextResponse.redirect(signedUrl, 302);
    for (const [k, v] of Object.entries(robotsHeaders)) {
      signedRes.headers.set(k, v);
    }
    return signedRes;
  }

  // Public sites: redirect to the R2 public domain (CDN-cached at edge).
  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';
  // Version the CDN URL by content sha. Objects uploaded via presigned PUT
  // (CLI, dashboard, anonymous publish) carry no Cache-Control, so the storage
  // CDN caches them with its default TTL; without a version the old bytes (or
  // a deleted file) keep being served after a republish. Blob.sha is written
  // by the worker from the bytes already in storage, so a `?v=` key never
  // points at content that isn't there yet. No blob row → unversioned URL.
  const blob = await prisma.blob.findUnique({
    where: { siteId_path: { siteId: site.id, path: rawPath } },
    select: { sha: true },
  });
  const version = blob?.sha ? `?v=${encodeURIComponent(blob.sha)}` : '';
  const publicUrl = `${protocol}://${env.NEXT_PUBLIC_S3_BUCKET_DOMAIN}/${site.id}/main/raw/${encodedPath}${version}`;

  const res = NextResponse.redirect(publicUrl, 302);
  // The redirect must never be cached, or the version key above goes stale.
  res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  for (const [k, v] of Object.entries(robotsHeaders)) res.headers.set(k, v);
  return res;
}
