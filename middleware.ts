import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PostHog } from 'posthog-node';
import { env } from '@/env.mjs';
import { SITE_ACCESS_COOKIE_NAME } from './lib/const';
import { InternalSite } from './lib/db/internal';
import { getSiteUrl } from './lib/get-site-url';
import { resolveSiteAlias } from './lib/resolve-site-alias';
import PostHogClient from './lib/server-posthog';
import { siteKeyBytes } from './lib/site-hmac-key';

export const config = {
  matcher: [
    // Match everything except:
    // - /api
    // - Next internals
    // - /_static (public)
    // - /_vercel
    '/((?!api/|_next/|_static/|_vercel).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  const posthog = PostHogClient();

  // 0) PostHog proxy
  if (url.pathname.startsWith('/relay-qYYb/')) {
    return proxyPostHog(req);
  }

  // 1) Normalize hostname (handle Vercel preview)
  let hostname = req.headers.get('host')!;
  if (hostname.endsWith(`.${env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)) {
    hostname = env.NEXT_PUBLIC_ROOT_DOMAIN;
  }

  // 2) Normalize path + query (translate + → %20 for UX)
  const normalizedPath = normalizePath(url);
  const { pathname, search } = normalizedPath;
  const path = pathname + search;
  const searchParams = search; // Preserve for rewrites

  // Build PostHog bootstrap cookie once for all routes
  const phBootstrap = await buildPHBootstrapCookie(req, posthog);

  // 3) Legacy redirect: flowershow.app/@... → my.flowershow.app/@...
  if (hostname === 'flowershow.app' && pathname.startsWith('/@')) {
    return withPHBootstrapCookie(
      NextResponse.redirect(
        new URL(`https://my.flowershow.app${path}`, req.url),
        { status: 301 },
      ),
      phBootstrap,
    );
  }

  // 4) Cloud app (authentication required)
  if (hostname === env.NEXT_PUBLIC_CLOUD_DOMAIN) {
    const session = await getToken({ req });

    if (!session && pathname !== '/login') {
      // Preserve the original URL as callbackUrl for post-login redirect
      const callbackUrl = encodeURIComponent(path);
      return withPHBootstrapCookie(
        NextResponse.redirect(
          new URL(`/login?callbackUrl=${callbackUrl}`, req.url),
        ),
        phBootstrap,
      );
    }
    if (pathname === '/login') {
      if (session) {
        return withPHBootstrapCookie(
          NextResponse.redirect(new URL('/', req.url)),
          phBootstrap,
        );
      }
      return withPHBootstrapCookie(
        NextResponse.rewrite(new URL(`/login`, req.url)),
        phBootstrap,
      );
    }

    if (pathname.startsWith('/cli/')) {
      return withPHBootstrapCookie(
        NextResponse.rewrite(new URL(path, req.url)),
        phBootstrap,
      );
    }

    return withPHBootstrapCookie(
      NextResponse.rewrite(new URL(`/dashboard${path}`, req.url)),
      phBootstrap,
    );
  }

  // // Rewrites for home pages
  // if (hostname === env.NEXT_PUBLIC_HOME_DOMAIN)
  //   return NextResponse.rewrite(new URL(`/home${path}`, req.url));

  // 5) Root domain (my.flowershow.app) — user sites at /@<user>/<project>
  if (hostname === env.NEXT_PUBLIC_ROOT_DOMAIN) {
    if (pathname === '/sitemap.xml')
      return rewrite(`/sitemap.xml`, req, phBootstrap);
    if (pathname === '/robots.txt')
      return rewrite(`/robots.txt`, req, phBootstrap);

    // Resolve alias to canonical /@user/project path
    const aliasResolved = resolveSiteAlias(pathname, 'from');
    const match = aliasResolved.match(/^\/@([^/]+)\/([^/]+)(.*)/);

    if (!match) return rewrite(`/not-found`, req, phBootstrap);

    const [, username, projectname, slug = ''] = match;

    // Look up site
    const site = await fetchSite(req, `/api/site/${username}/${projectname}`);

    if (!site) return rewrite(`/not-found`, req, phBootstrap);

    // Per-site login page
    if (slug === '/_login') {
      return rewrite(
        `/site-access/${username}/${projectname}`,
        req,
        phBootstrap,
      );
    }

    // Password gate
    const guard = await ensureSiteAccess(req, site, phBootstrap);
    if (guard) return guard;

    // Per-site sitemap
    if (slug === '/sitemap.xml') {
      return rewrite(
        `/api/sitemap/${username}/${projectname}`,
        req,
        phBootstrap,
      );
    }

    // Raw asset file access
    const raw = rewriteRawIfNeeded(
      slug,
      `/api/raw/${username}/${projectname}`,
      req,
      phBootstrap,
    );
    if (raw) return raw;

    // All other: render the site
    return rewrite(
      `/site/${username}/${projectname}${slug}${searchParams}`,
      req,
      phBootstrap,
    );
  }

  // 6) Custom domains
  if (hostname === env.NEXT_PUBLIC_HOME_DOMAIN) {
    if (pathname === '/') {
      // console.log({ phBootstrap });
      if (phBootstrap) {
        try {
          const flags = phBootstrap.value.featureFlags;

          const landingPageFlagName = 'landing-page-a-b-drag-n-drop';
          const landingPageFlag = flags[landingPageFlagName];
          const isTestVariant = landingPageFlag === 'test';

          // This is only to send "Feature flag called event" for this flag
          await posthog.getFeatureFlag(
            landingPageFlagName,
            phBootstrap.value.distinctID,
          );

          // console.log({ isVariantB });

          if (!isTestVariant) {
            return withPHBootstrapCookie(
              NextResponse.rewrite(new URL(`/home${path}`, req.url)),
              phBootstrap,
            );
          } else {
            return withPHBootstrapCookie(
              NextResponse.rewrite(
                new URL(`/site/_domain/${hostname}${path}`, req.url),
              ),
              phBootstrap,
            );
          }
        } catch {
          return withPHBootstrapCookie(
            NextResponse.rewrite(
              new URL(`/site/_domain/${hostname}${path}`, req.url),
            ),
            phBootstrap,
          );
        }
      }
    }

    if (pathname === '/claim') {
      return rewrite(`/home${path}`, req, phBootstrap);
    }
  }

  if (pathname === '/robots.txt') {
    return rewrite(`/api/robots/${hostname}`, req, phBootstrap);
  }

  // Look up site
  const site = await fetchSite(req, `/api/site/_domain/${hostname}`);
  if (!site) return rewrite(`/not-found`, req, phBootstrap);

  // Per-site login page
  if (pathname === '/_login') {
    return rewrite(`/site-access/_domain/${hostname}`, req, phBootstrap);
  }

  // Password gate
  const guard = await ensureSiteAccess(req, site, phBootstrap);
  if (guard) return guard;

  // Per-site sitemap
  if (pathname === '/sitemap.xml') {
    // For custom domains: username "_domain", project = hostname
    return rewrite(`/api/sitemap/_domain/${hostname}`, req, phBootstrap);
  }

  // Raw asset file access
  const raw = rewriteRawIfNeeded(
    path,
    `/api/raw/_domain/${hostname}`,
    req,
    phBootstrap,
  );
  if (raw) return raw;

  // Render custom-domain site (path already includes search params)
  return withPHBootstrapCookie(
    NextResponse.rewrite(new URL(`/site/_domain/${hostname}${path}`, req.url)),
    phBootstrap,
  );
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function rewrite(targetPath: string, req: NextRequest, ph?: PHBootstrap) {
  return withPHBootstrapCookie(
    NextResponse.rewrite(new URL(targetPath, req.url)),
    ph ?? null,
  );
}

function normalizePath(url: URL) {
  const pathname = url.pathname.replace(/\+/g, '%20');
  const search = url.search; // already encoded
  return { pathname, search };
}

// TODO types
async function fetchSite(req: NextRequest, apiPath: string) {
  try {
    const res = await fetch(new URL(apiPath, req.nextUrl.origin), {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Site fetch failed');
    const site = await res.json();
    return (site as InternalSite) ?? null;
  } catch {
    return null;
  }
}

async function ensureSiteAccess(
  req: NextRequest,
  site: InternalSite,
  ph: PHBootstrap,
) {
  if (site.privacyMode !== 'PASSWORD') return null;

  // TEMPORARY FIX: Skip password check for non-HTML requests (assets, API calls, etc.)
  //
  // This prevents Next.js images from failing with 400 Bad Request, but creates a security hole:
  // - Assets are accessible without authentication if you know the direct URL
  // - The root cause: Next.js image optimization (/_next/image) internally fetches the source
  //   image without forwarding the client's authentication cookies, causing the password check to fail
  //
  // PROPER SOLUTION: Implement a custom Next.js image loader that:
  // 1. Fetches from /api/raw/... endpoints with authentication
  // 2. Manually passes the site access cookie from the original request headers
  // 3. Preserves image optimization while maintaining authentication
  const accept = req.headers.get('accept') || '';
  const isHtmlRequest = accept.includes('text/html');
  if (!isHtmlRequest) return null;

  const cookie = req.cookies.get(SITE_ACCESS_COOKIE_NAME(site.id));
  if (!cookie) {
    return redirectToSiteLogin(req, site, ph);
  }

  try {
    const secret = await siteKeyBytes(site.id, site.tokenVersion);
    await jwtVerify(cookie.value, secret, { audience: site.id });
    return null; // verified
  } catch {
    return redirectToSiteLogin(req, site, ph);
  }
}

function redirectToSiteLogin(
  req: NextRequest,
  site: InternalSite,
  ph: PHBootstrap,
) {
  const returnTo = encodeURIComponent(
    req.nextUrl.pathname + req.nextUrl.search,
  );
  const loginUrl = `${getSiteUrl(site)}/_login?returnTo=${returnTo}`;
  return withPHBootstrapCookie(
    NextResponse.redirect(new URL(loginUrl, req.url), 307),
    ph,
  );
}

/**
 * Whitelist of known file extensions for raw file serving.
 * Only files with these extensions will be treated as raw assets.
 *
 * NOTE: Multi-part extensions (e.g., .tar.gz, .d.ts) are not currently supported.
 * Only the last segment after the final dot is checked against this whitelist.
 */
const KNOWN_FILE_EXTENSIONS = new Set([
  // Documents
  'md',
  'mdx',
  'pdf',
  'txt',
  'html',
  // Images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  // Data
  'csv',
  'json',
  'yaml',
  'yml',
  'xml',
  // Media
  'mp4',
  'mp3',
  'wav',
  'ogg',
  // Archives
  'zip',
  'tar',
  'gz',
  // Web assets
  'css',
  'js',
  'ico',
  // Fonts
  'woff',
  'woff2',
  'ttf',
  'eot',
]);

/**
 * Determines if a path should be rewritten as a raw file request.
 * Uses a whitelist approach to identify valid file extensions, which handles
 * edge cases where filenames contain dots (e.g., "my.config.json", "file.v2.png").
 *
 * Only checks the extension in the filename (last path segment), not in folder names.
 *
 * @param inputPath - The request path (may include query parameters)
 * @param apiBase - The API base path to rewrite to
 * @param req - The Next.js request object
 * @param ph - The PostHog bootstrap cookie data
 * @returns NextResponse for rewrite, or null if not a raw file
 */
function rewriteRawIfNeeded(
  inputPath: string,
  apiBase: string,
  req: NextRequest,
  ph: PHBootstrap,
) {
  // Extract the path before query parameters
  const [pathPart] = inputPath.split('&');
  if (!pathPart) return null;

  // Get the filename (last segment of the path)
  const lastSlashIndex = pathPart.lastIndexOf('/');
  const filename =
    lastSlashIndex === -1 ? pathPart : pathPart.slice(lastSlashIndex + 1);

  // Find the last dot in the filename to identify potential extension
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return null; // No extension found

  // Extract the potential extension (everything after the last dot, without the dot itself)
  const potentialExt = filename.slice(lastDotIndex + 1).toLowerCase();

  // Check if the extension is in our whitelist of known file types
  // This prevents false positives where dots are part of the filename
  // (e.g., "my.data.file" won't be treated as having a "file" extension)
  if (!KNOWN_FILE_EXTENSIONS.has(potentialExt)) {
    return null; // Not a recognized file extension, treat as regular path
  }

  // Normalize and encode each path segment
  const encoded = inputPath.split('/').map(normaliseSegment).join('/');

  return withPHBootstrapCookie(
    NextResponse.rewrite(new URL(`${apiBase}${encoded}`, req.url)),
    ph,
  );
}

/**
 * Normalise a single path segment:
 * 1. Escape stray % so decodeURIComponent won't throw
 * 2. Decode valid encodings
 * 3. Re-encode cleanly
 */
function normaliseSegment(raw: string) {
  const fixed = raw.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
  let decoded: string;
  try {
    decoded = decodeURIComponent(fixed);
  } catch {
    decoded = fixed;
  }
  return encodeURIComponent(decoded);
}

function proxyPostHog(req: NextRequest) {
  const url = req.nextUrl;
  const isStatic = url.pathname.startsWith('/relay-qYYb/static/');
  const hostname = isStatic ? 'eu-assets.i.posthog.com' : 'eu.i.posthog.com';

  const proxied = url.clone();
  proxied.protocol = 'https:';
  proxied.hostname = hostname;
  proxied.port = '443';
  proxied.pathname = url.pathname.replace(/^\/relay-qYYb/, ''); // strip prefix

  const headers = new Headers(req.headers);
  headers.set('host', hostname);

  return NextResponse.rewrite(proxied, { headers });
}

type PHBootstrap = {
  name: string;
  value: {
    distinctID: string;
    featureFlags: Record<string, string | boolean>;
    featureFlagsPayloads: Record<string, any>;
  };
} | null;

async function buildPHBootstrapCookie(req: NextRequest, posthog: PostHog) {
  // Only for real HTML page views
  const isGet = req.method === 'GET';
  const accept = req.headers.get('accept') || '';
  const isHtml = accept.includes('text/html');
  if (!isGet || !isHtml) return null;

  const apiKey = env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;

  // Try to reuse PH’s own cookie if it exists (so the user keeps the same distinct_id)
  const phCookieName = `ph_${apiKey}_posthog`;
  const phCookie = req.cookies.get(phCookieName);

  let distinctId: string;
  try {
    distinctId = phCookie
      ? JSON.parse(phCookie.value)?.distinct_id
      : crypto.randomUUID();
  } catch {
    distinctId = crypto.randomUUID();
  }

  try {
    const data = await posthog.getAllFlagsAndPayloads(distinctId);
    const bootstrapData = {
      distinctID: distinctId,
      featureFlags: data.featureFlags ?? {},
      featureFlagsPayloads: data.featureFlagPayloads ?? {},
    };

    return {
      name: 'ph_bootstrap',
      value: bootstrapData,
    };
  } catch {
    return null;
  }
}

function withPHBootstrapCookie(res: NextResponse, ph: PHBootstrap) {
  if (!ph) return res;
  const cookieName = ph.name;
  const cookieValue = JSON.stringify(ph.value);
  res.cookies.set(cookieName, cookieValue, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });
  res.headers.set(
    'Vary',
    [res.headers.get('Vary'), 'Cookie'].filter(Boolean).join(', '),
  );
  return res;
}
