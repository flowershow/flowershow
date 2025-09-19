import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/env.mjs";
import { resolveSiteAlias } from "./lib/resolve-site-alias";
import { SITE_ACCESS_COOKIE_NAME } from "./lib/const";
import { siteKeyBytes } from "./lib/site-hmac-key";
import { jwtVerify } from "jose";
import { getSiteUrl } from "./lib/get-site-url";
import { InternalSite } from "./lib/db/internal";

export const config = {
  matcher: [
    // Match everything except:
    // - /api
    // - Next internals
    // - /_static (public)
    // - root files in /public (favicon, etc) — BUT still include sitemap.xml & robots.txt
    "/((?!api/|_next/|_static/|_vercel|(?!sitemap\\.xml|robots\\.txt)[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // 0) PostHog proxy
  if (url.pathname.startsWith("/relay-qYYb/")) {
    return proxyPostHog(req);
  }

  // 1) Normalize hostname (handle Vercel preview)
  let hostname = req.headers.get("host")!;
  if (hostname.endsWith(`.${env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)) {
    hostname = env.NEXT_PUBLIC_ROOT_DOMAIN;
  }

  // 2) Normalize path + query (translate + → %20 for UX)
  const normalizedPath = normalizePath(url);
  const { pathname, search } = normalizedPath;
  const path = pathname + search;

  // 3) Legacy redirect: flowershow.app/@... → my.flowershow.app/@...
  if (hostname === "flowershow.app" && pathname.startsWith("/@")) {
    return NextResponse.redirect(
      new URL(`https://my.flowershow.app${path}`, req.url),
      { status: 301 },
    );
  }

  // 4) Cloud app (dashboard)
  if (hostname === env.NEXT_PUBLIC_CLOUD_DOMAIN) {
    const session = await getToken({ req });

    if (!session && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.rewrite(new URL(`/cloud${path}`, req.url));
  }

  // 5) Root domain (my.flowershow.app) — user sites at /@<user>/<project>
  if (hostname === env.NEXT_PUBLIC_ROOT_DOMAIN) {
    if (pathname === "/sitemap.xml") return rewrite(`/sitemap.xml`, req);
    if (pathname === "/robots.txt") return rewrite(`/robots.txt`, req);

    // Resolve alias to canonical /@user/project path
    const aliasResolved = resolveSiteAlias(pathname, "from");
    const match = aliasResolved.match(/^\/@([^/]+)\/([^/]+)(.*)/);

    if (!match) return rewrite(`/not-found`, req);

    const [, username, projectname, slug = ""] = match;

    // Look up site
    const site = await fetchSite(req, `/api/site/${username}/${projectname}`);
    if (!site) return rewrite(`/not-found`, req);

    // Per-site login page
    if (slug === "/_login") {
      return rewrite(`/site-access/${username}/${projectname}`, req);
    }

    // Password gate
    const guard = await ensureSiteAccess(req, site);
    if (guard) return guard;

    // Per-site sitemap
    if (slug === "/sitemap.xml") {
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
    return rewrite(`/site/${username}/${projectname}${slug}`, req);
  }

  // 6) Custom domains
  if (pathname === "/robots.txt") {
    return rewrite(`/api/robots/${hostname}`, req);
  }

  // Look up site
  const site = await fetchSite(req, `/api/site/_domain/${hostname}`);
  if (!site) return rewrite(`/not-found`, req);

  // Per-site login page
  if (pathname === "/_login") {
    return rewrite(`/site-access/_domain/${hostname}`, req);
  }

  // Password gate
  const guard = await ensureSiteAccess(req, site);
  if (guard) return guard;

  // Per-site sitemap
  if (pathname === "/sitemap.xml") {
    // For custom domains: username "_domain", project = hostname
    return rewrite(`/api/sitemap/_domain/${hostname}`, req);
  }

  // Raw files: /_r/-/<path>
  const raw = rewriteRawIfNeeded(path, `/api/raw/_domain/${hostname}`, req);
  if (raw) return raw;

  // Render custom-domain site
  return NextResponse.rewrite(
    new URL(`/site/_domain/${hostname}${path}`, req.url),
  );
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function rewrite(targetPath: string, req: NextRequest) {
  return NextResponse.rewrite(new URL(targetPath, req.url));
}

function normalizePath(url: URL) {
  const pathname = url.pathname.replace(/\+/g, "%20");
  const search = url.search; // already encoded
  return { pathname, search };
}

// TODO types
async function fetchSite(req: NextRequest, apiPath: string) {
  try {
    const res = await fetch(new URL(apiPath, req.nextUrl.origin), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Site fetch failed");
    const site = await res.json();
    return (site as InternalSite) ?? null;
  } catch {
    return null;
  }
}

async function ensureSiteAccess(req: NextRequest, site: InternalSite) {
  if (site.privacyMode !== "PASSWORD") return null;

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

  const encoded = filePath.split("/").map(normaliseSegment).join("/");

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
  const fixed = raw.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
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
  const isStatic = url.pathname.startsWith("/relay-qYYb/static/");
  const hostname = isStatic ? "eu-assets.i.posthog.com" : "eu.i.posthog.com";

  const proxied = url.clone();
  proxied.protocol = "https:";
  proxied.hostname = hostname;
  proxied.port = "443";
  proxied.pathname = url.pathname.replace(/^\/relay-qYYb/, ""); // strip prefix

  const headers = new Headers(req.headers);
  headers.set("host", hostname);

  return NextResponse.rewrite(proxied, { headers });
}
