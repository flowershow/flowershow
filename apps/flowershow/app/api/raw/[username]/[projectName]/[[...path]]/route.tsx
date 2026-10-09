import { getContentType, isSiteChromeFile } from '@flowershow/core';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';
import { fetchFile, generatePresignedGetUrl } from '@/lib/content-store';
import {
  CUSTOM_CSS_PATH,
  customCssCacheControl,
  customCssCdnCacheControl,
  customCssVersion,
  etagMatches,
} from '@/lib/custom-css';
import { hasSiteAccess, siteAccessSelect } from '@/lib/site-access';
import { isSiteOwnHost, redirectToSiteOwnHost } from '@/lib/site-host';
import prisma from '@/server/db';

const rawSiteSelect = {
  ...siteAccessSelect,
  isTemporary: true,
  expiresAt: true,
  subdomain: true,
  customDomain: true,
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

  // Reserved site-chrome files (root `_footer.html`, `_navbar.html`) are rendered into the
  // site layout and never served at their own URL.
  if (isSiteChromeFile(path.join('/'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
  const isHtml = getContentType(ext) === 'text/html'; // .html and .htm

  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  // Proxied HTML is served as an active document, so only serve it on the
  // site's own host(s) (subdomain or custom domain). /api/* is not host-routed
  // by middleware, so this handler enforces it. Only the Host header is
  // trusted; forwarded-host headers are ignored. Other hosts get a redirect to
  // the same file on the site's own host.
  if (isHtml && !isSiteOwnHost(req.headers.get('host'), site)) {
    return redirectToSiteOwnHost(site, `/${encodedPath}${req.nextUrl.search}`);
  }

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
          'X-Content-Type-Options': 'nosniff',
          ...robotsHeaders,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  // The site's root custom.css, requested on the site's own host (the layout
  // links it as a root-relative `/custom.css?v=<hash>`): proxy it with a 200
  // rather than redirecting to storage, because `url()` in a stylesheet
  // resolves against the sheet's final URL, so a redirect would break
  // root-relative and relative font/image paths. Exact path match only; other
  // .css files keep the storage redirect. On any other host (dashboard, app
  // domains, another site) fall through to the storage redirect as before, so
  // user CSS is never served same-origin with Flowershow's own pages.
  if (
    rawPath === CUSTOM_CSS_PATH &&
    isSiteOwnHost(req.headers.get('host'), site)
  ) {
    return serveCustomCss({
      req,
      site,
      headers: robotsHeaders,
    });
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

async function serveCustomCss({
  req,
  site,
  headers: extraHeaders,
}: {
  req: NextRequest;
  site: {
    id: string;
    userId: string;
    privacyMode: string;
    isTemporary: boolean;
    expiresAt: Date | null;
  };
  headers: Record<string, string>;
}) {
  // Neither error response may be cached: a missing file can be published
  // later, and a storage error is transient (503, not "file deleted").
  const noStore = { 'Cache-Control': 'no-store' };
  let content: string | null;
  try {
    content = await fetchFile({ projectId: site.id, path: CUSTOM_CSS_PATH });
  } catch (err) {
    console.error('Failed to fetch custom.css', { siteId: site.id, err });
    return NextResponse.json(
      { error: 'Storage unavailable' },
      { status: 503, headers: { ...noStore, ...extraHeaders } },
    );
  }
  if (!content) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: { ...noStore, ...extraHeaders } },
    );
  }

  // The ETag and the immutable decision both come from the bytes served, never
  // from the requested `v`, so content is never cached under a key that does
  // not describe it (e.g. a request racing a republish).
  const version = customCssVersion(content);
  const versionMatches = req.nextUrl.searchParams.get('v') === version;
  // Password sites: browser cache only, never a shared cache.
  const isPrivate = site.privacyMode === 'PASSWORD';
  const headers: Record<string, string> = {
    'Cache-Control': customCssCacheControl({
      versionMatches,
      isPrivate,
      // Anonymous sites: never cached past their expiry.
      expiresAt: site.isTemporary ? site.expiresAt : null,
    }),
    ETag: `"${version}"`,
    ...extraHeaders,
  };

  if (etagMatches(req.headers.get('if-none-match'), version)) {
    return new NextResponse(null, { status: 304, headers });
  }

  // Edge caching only on the 200 (a 304 is per-client and never edge-cached).
  const cdnCacheControl = customCssCdnCacheControl({
    versionMatches,
    isPrivate,
    // Anonymous (temporary) sites expire: never edge-cached.
    isTemporary: site.isTemporary || site.userId === ANONYMOUS_USER_ID,
  });

  return new NextResponse(content, {
    status: 200,
    headers: {
      ...headers,
      ...(cdnCacheControl ? { 'CDN-Cache-Control': cdnCacheControl } : {}),
      'Content-Type': 'text/css; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
