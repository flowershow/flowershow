import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { fetchFile, generatePresignedGetUrl } from '@/lib/content-store';
import prisma from '@/server/db';

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
          select: { id: true, privacyMode: true },
        })
      : await prisma.site.findFirst({
          where: { projectName, user: { username } },
          select: { id: true, privacyMode: true },
        });

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // R2 keys use the literal path (matching how uploadFile stores them — no URL encoding).
  // URL-encoding is only needed when constructing HTTP redirect URLs, not the key itself.
  const rawPath = path.join('/');
  const r2Key = `${site.id}/main/raw/${rawPath}`;

  const isHtml = rawPath.endsWith('.html');

  // HTML files: proxy the content so the browser renders them
  // instead of redirecting to R2 (which triggers a download).
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

  // For password-protected sites, use a short-lived presigned URL
  // so the asset is only accessible briefly even if the URL is shared.
  if (site.privacyMode === 'PASSWORD') {
    const signedUrl = await generatePresignedGetUrl(r2Key, 300); // 5 minutes
    return NextResponse.redirect(signedUrl, 302);
  }

  // For public sites, redirect directly to the R2 public domain.
  // If Cloudflare CDN is in front of this domain, images are cached at edge.
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
