import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { getContentType } from '@/lib/content-store';
import { PublicSite } from '@/server/api/types';
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

  let site: PublicSite | null = null;

  if (username === '_domain') {
    site = await prisma.site.findFirst({
      where: {
        customDomain: projectName,
      },
      include: { user: true },
    });
  } else {
    site = await prisma.site.findFirst({
      where: {
        projectName,
        user: {
          username,
        },
      },
      include: { user: true },
    });
  }

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';

  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const R2FileUrl = `${protocol}://${env.NEXT_PUBLIC_S3_BUCKET_DOMAIN}/${site.id}/${site.ghBranch ?? 'main'}/raw/${encodedPath}`;

  try {
    const fileResponse = await fetch(R2FileUrl, {
      // Add headers for prod compatibility if R2 needs auth/public access
      headers: {
        // 'Range': req.headers.get('Range') || undefined, // Optional: support byte ranges
      },
    });

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: fileResponse.status },
      );
    }

    // Get Content-Type from R2 response
    let contentType = fileResponse.headers.get('Content-Type') || '';

    console.log({ contentType });

    // Fallback: derive from extension if missing/unknown
    if (
      !contentType ||
      contentType.startsWith('application/') ||
      contentType === 'octet/stream'
    ) {
      const ext = path[path.length - 1]?.split('.').pop()?.toLowerCase();

      if (!ext) {
        return NextResponse.json(
          { error: 'Missing file extension' },
          { status: 400 },
        );
      }

      contentType = getContentType(ext) || 'application/octet-stream';
    }

    const headers = new Headers(fileResponse.headers);
    headers.set('Content-Type', contentType);
    // Ensure no download disposition (omit or set 'inline')
    headers.delete('Content-Disposition');
    // Remove compression headers to avoid ERR_CONTENT_DECODING_FAILED
    // The body stream may already be decompressed by fetch()
    headers.delete('Content-Encoding');
    headers.delete('Content-Length');
    const maxAge =
      contentType === 'text/html' || contentType === 'text/markdown' ? 0 : 300;
    headers.set('Cache-Control', `max-age=${maxAge}, must-revalidate`);

    return new Response(fileResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
