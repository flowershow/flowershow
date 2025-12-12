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
    // - root files in /public (favicon, etc) — BUT still include sitemap.xml & robots.txt
    '/((?!api/|_next/|_static/|_vercel|(?!sitemap\\.xml|robots\\.txt)[\\w-]+\\.\\w+).*)',
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

  // 3) Legacy redirect: flowershow.app/@... → my.flowershow.app/@...
  if (hostname === 'flowershow.app' && pathname.startsWith('/@')) {
    return NextResponse.redirect(
      new URL(`https://my.flowershow.app${path}`, req.url),
      { status: 301 },
    );
  }

  // 4) Cloud app (dashboard)
  if (hostname === env.NEXT_PUBLIC_CLOUD_DOMAIN) {
    const phBootstrap = await buildPHBootstrapCookie(req, posthog);

    const session = await getToken({ req });

    if (!session && pathname !== '/login') {
      return withPHBootstrapCookie(
        NextResponse.redirect(new URL('/login', req.url)),
        phBootstrap,
      );
    }
    if (session && pathname === '/login') {
      return withPHBootstrapCookie(
        NextResponse.redirect(new URL('/', req.url)),
        phBootstrap,
      );
    }
    return withPHBootstrapCookie(
      NextResponse.rewrite(new URL(`/cloud${path}`, req.url)),
      phBootstrap,
    );
  }

  // 5) Root domain (my.flowershow.app) — user sites at /@<user>/<project>
  if (hostname === env.NEXT_PUBLIC_ROOT_DOMAIN) {
    if (pathname === '/sitemap.xml') return rewrite(`/sitemap.xml`, req);
    if (pathname === '/robots.txt') return rewrite(`/robots.txt`, req);

    // Resolve alias to canonical /@user/project path
    const aliasResolved = resolveSiteAlias(pathname, 'from');
    const match = aliasResolved.match(/^\/@([^/]+)\/([^/]+)(.*)/);

    if (!match) return rewrite(`/not-found`, req);

    const [, username, projectname, slug = ''] = match;

    // Look up site
    const site = await fetchSite(req, `/api/site/${username}/${projectname}`);
    if (!site) return rewrite(`/not-found`, req);

    // Per-site login page
    if (slug === '/_login') {
      return rewrite(`/site-access/${username}/${projectname}`, req);
    }

    // Password gate
    const guard = await ensureSiteAccess(req, site);
    if (guard) return guard;

    // Per-site sitemap
    if (slug === '/sitemap.xml') {
      return rewrite(`/api/sitemap/${username}/${projectname}`, req);
    }

    // Raw files: /_r/-/<path>
    const raw = rewriteRawIfNeeded(
      slug,
      `/api/raw/${username}/${projectname}`,
      req,
    );
    if (raw) return raw;

    // All other: render the site
    return rewrite(
      `/site/${username}/${projectname}${slug}${searchParams}`,
      req,
    );
  }

  // 6) Custom domains
  if (pathname === '/robots.txt') {
    return rewrite(`/api/robots/${hostname}`, req);
  }

  // Look up site
  const site = await fetchSite(req, `/api/site/_domain/${hostname}`);
  if (!site) return rewrite(`/not-found`, req);

  // Per-site login page
  if (pathname === '/_login') {
    return rewrite(`/site-access/_domain/${hostname}`, req);
  }

  // Password gate
  const guard = await ensureSiteAccess(req, site);
  if (guard) return guard;

  // Per-site sitemap
  if (pathname === '/sitemap.xml') {
    // For custom domains: username "_domain", project = hostname
    return rewrite(`/api/sitemap/_domain/${hostname}`, req);
  }

  // Raw files: /_r/-/<path>
  const raw = rewriteRawIfNeeded(path, `/api/raw/_domain/${hostname}`, req);
  if (raw) return raw;

  // Posthog experiments for flowershow.app site pages
  if (
    (hostname === 'flowershow.app' || hostname === 'test.localhost:3000') &&
    pathname === '/'
  ) {
    const phBootstrap = await buildPHBootstrapCookie(req, posthog);
    // console.log({ phBootstrap });
    if (phBootstrap) {
      try {
        const flags = phBootstrap.value.featureFlags;

        const landingPageFlagName = 'landing-page-a-b';
        const landingPageFlag = flags[landingPageFlagName];
        const isVariantB = landingPageFlag === 'test';

        // This is only to send "Feature flag called event" for this flag
        await posthog.getFeatureFlag(
          landingPageFlagName,
          phBootstrap.value.distinctID,
        );

        // console.log({ isVariantB });

        if (isVariantB) {
          return withPHBootstrapCookie(
            NextResponse.rewrite(
              new URL(`/site/_domain/${hostname}/README-B`, req.url),
            ),
            phBootstrap,
          );
        } else {
          return withPHBootstrapCookie(
            NextResponse.rewrite(new URL(`/site/_domain/${hostname}`, req.url)),
            phBootstrap,
          );
        }
      } catch {
        return NextResponse.rewrite(
          new URL(`/site/_domain/${hostname}${path}`, req.url),
        );
      }
    }
  }

  // Render custom-domain site (path already includes search params)
  return NextResponse.rewrite(
    new URL(`/site/_domain/${hostname}${path}`, req.url),
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

async function ensureSiteAccess(req: NextRequest, site: InternalSite) {
  if (site.privacyMode !== 'PASSWORD') return null;

  const cookie = req.cookies.get(SITE_ACCESS_COOKIE_NAME(site.id));
  if (!cookie) {
    return redirectToSiteLogin(req, site);
  }

  try {
    const secret = await siteKeyBytes(site.id, site.tokenVersion);
    await jwtVerify(cookie.value, secret, { audience: site.id });
    return null; // verified
  } catch {
    return redirectToSiteLogin(req, site);
  }
}

function redirectToSiteLogin(req: NextRequest, site: InternalSite) {
  const returnTo = encodeURIComponent(
    req.nextUrl.pathname + req.nextUrl.search,
  );
  const loginUrl = `${getSiteUrl(site)}/_login?returnTo=${returnTo}`;
  return NextResponse.redirect(new URL(loginUrl, req.url), 307);
}

function rewriteRawIfNeeded(
  inputPath: string,
  apiBase: string,
  req: NextRequest,
) {
  const rawMatch = inputPath?.match(/^\/_r\/(-)\/(.+)/);
  if (!rawMatch) return null;

  const branch = rawMatch[1]!;
  const filePath = rawMatch[2]!;

  const encoded = filePath.split('/').map(normaliseSegment).join('/');

  return NextResponse.rewrite(
    new URL(`${apiBase}/${branch}/${encoded}`, req.url),
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
