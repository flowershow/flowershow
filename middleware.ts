import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/env.mjs";
import { resolveSiteAlias } from "./lib/resolve-site-alias";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|(?!sitemap\\.xml|robots\\.txt)[\\w-]+\\.\\w+).*)",
  ],
};

// TODO this is getting out of hand, we need to refactor this
export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request
  let hostname = req.headers.get("host")!;
  console.log({ hostname });

  // special case for Vercel preview deployment URLs
  if (hostname.endsWith(`.${env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)) {
    hostname = env.NEXT_PUBLIC_ROOT_DOMAIN;
  }

  const searchParams = req.nextUrl.searchParams.toString();
  // Translate + to %20 (our custom space encoding for better UX),
  // otherwise it will get encoded as %2B
  // https://github.com/datopian/datahub/issues/1172
  const pathname = url.pathname.replace(/\+/g, "%20");
  const path = `${pathname}${
    searchParams.length > 0 ? `?${searchParams}` : ""
  }`;

  // Handle legacy Flowershow user site URLs
  if (hostname === "flowershow.app" && path.startsWith("/@")) {
    return NextResponse.redirect(
      new URL(`https://my.flowershow.app${path}`, req.url),
      { status: 301 },
    );
  }

  // CLOUD DOMAIN
  if (
    hostname === env.NEXT_PUBLIC_CLOUD_DOMAIN ||
    hostname === `staging-${env.NEXT_PUBLIC_CLOUD_DOMAIN}`
  ) {
    const session = await getToken({ req });

    if (!session && path !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session && path == "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.rewrite(new URL(`/cloud${path}`, req.url));
  }

  // ROOT DOMAIN
  if (
    hostname === env.NEXT_PUBLIC_ROOT_DOMAIN ||
    hostname === `staging-${env.NEXT_PUBLIC_ROOT_DOMAIN}`
  ) {
    if (path === "/sitemap.xml") {
      return NextResponse.rewrite(new URL("/sitemap.xml", req.url));
    }

    if (path === "/robots.txt") {
      return NextResponse.rewrite(new URL(`/robots.txt`, req.url));
    }

    const aliasResolvedPath = resolveSiteAlias(path, "from");

    // if resolved path matches /@{username}/{project}/{restofpath}
    const userProjectMatch = aliasResolvedPath.match(
      /^\/@([^/]+)\/([^/]+)(.*)/,
    );

    if (userProjectMatch) {
      const username = userProjectMatch[1];
      const projectName = userProjectMatch[2];
      const restOfPath = userProjectMatch[3];

      if (restOfPath === "/sitemap.xml") {
        return NextResponse.rewrite(
          new URL(`/api/sitemap/${username}/${projectName}`, req.url),
        );
      }

      const rawPathMatch = restOfPath?.match(/^\/_r\/(-)\/(.+)/);

      // raw file paths (e.g. /_r/-/data/some.csv)
      if (rawPathMatch) {
        const branch = rawPathMatch[1]!;
        const filePath = rawPathMatch[2]!;

        const encodedFilePath = filePath
          .split("/") // keep real “/” separators intact
          .map(normaliseSegment)
          .join("/");

        return NextResponse.rewrite(
          new URL(
            `/api/raw/${username}/${projectName}/${branch}/${encodedFilePath}`,
            req.url,
          ),
        );
      }

      return NextResponse.rewrite(
        new URL(`/${username}/${projectName}${restOfPath}`, req.url),
      );
    } else {
      // otherwise it's a normal JSX page in /home folder
      return NextResponse.rewrite(new URL(`/home${path}`, req.url));
    }
  }

  // CUSTOM DOMAIN
  if (path === "/robots.txt") {
    return NextResponse.rewrite(new URL(`/api/robots/${hostname}`, req.url));
  }

  if (path === "/sitemap.xml") {
    // For custom domains, we use _domain as the username and hostname as the project name
    // This matches the site lookup in the sitemap API that checks customDomain field
    return NextResponse.rewrite(
      new URL(`/api/sitemap/_domain/${hostname}`, req.url),
    );
  }

  const rawPathMatch = path?.match(/^\/_r\/(-)\/(.*)/);

  // raw file paths (e.g. /_r/-/data/some.csv)
  if (rawPathMatch) {
    const branch = rawPathMatch[1]!;
    const filePath = rawPathMatch[2]!;

    const encodedFilePath = filePath
      .split("/") // keep real “/” separators intact
      .map(normaliseSegment)
      .join("/");

    return NextResponse.rewrite(
      new URL(
        `/api/raw/_domain/${hostname}/${branch}/${encodedFilePath}`,
        req.url,
      ),
    );
  }

  // rewrite all other domains and subdomains to /domain/{hostname}/{path}
  return NextResponse.rewrite(new URL(`/_domain/${hostname}${path}`, req.url));
}

function normaliseSegment(raw: string) {
  // 1. Turn every stray % into %25 so decodeURIComponent won’t crash
  const fixed = raw.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");

  // 2. Decode whatever *was* validly encoded, e.g. %20 → space
  //    (wrapped in try/catch just in case)
  let decoded: string;
  try {
    decoded = decodeURIComponent(fixed);
  } catch {
    decoded = fixed; // fall back – very unlikely now
  }

  // 3. Re-encode so the segment is fully, correctly escaped
  return encodeURIComponent(decoded);
}
