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
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

// TODO this is getting out of hand, we need to refactor this
export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request
  let hostname = req.headers.get("host")!;

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
    const aliasResolvedPath = resolveSiteAlias(path, "from");

    // if resolved path matches /@{username}/{project}/{restofpath}
    const userProjectMatch = aliasResolvedPath.match(
      /^\/@([^/]+)\/([^/]+)(.*)/,
    );

    if (userProjectMatch) {
      const username = userProjectMatch[1];
      const projectName = userProjectMatch[2];
      const restOfPath = userProjectMatch[3];

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

      // datapackage paths (e.g. /datapackage.json)
      if (restOfPath?.match(/\/datapackage\.(json|yaml|yml)$/)) {
        // TODO: make this a redirect (permanent) so that people use raw path instead?
        return NextResponse.rewrite(
          new URL(
            `/api/raw/${username}/${projectName}/-${restOfPath}`,
            req.url,
          ),
        );
      }

      // OLD - to be removed in the future

      // NOTE: doesn't support nested paths
      if (restOfPath?.match(/^\/view\/.+$/)) {
        return NextResponse.redirect(
          new URL(path.replace(/\/view\/.+$/, ""), req.url),
        );
      }

      // NOTE: doesn't support nested paths
      if (restOfPath?.match(/^\/r\/.+$/)) {
        const resourceWithExtension = restOfPath.replace(/^\/r\//, "");
        return NextResponse.rewrite(
          new URL(
            `/api/raw-old/${username}/${projectName}/${resourceWithExtension}`,
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

  // datapackage paths (e.g. /datapackage.json)
  if (path?.match(/\/datapackage\.(json|yaml|yml)$/)) {
    // TODO: make this a redirect (permanent) so that people use raw path instead?
    return NextResponse.rewrite(
      new URL(`/api/raw/_domain/${hostname}/-${path}`, req.url),
    );
  }

  // OLD - to be removed in the future

  // NOTE: doesn't support nested paths
  if (path?.match(/^\/view\/.+$/)) {
    return NextResponse.redirect(
      new URL(path.replace(/\/view\/.+$/, ""), req.url),
    );
  }

  // NOTE: doesn't support nested paths
  if (path?.match(/^\/r\/.+$/)) {
    const resourceWithExtension = path.replace(/^\/r\//, "");
    return NextResponse.rewrite(
      new URL(
        `/api/raw-old/_domain/${hostname}/${resourceWithExtension}`,
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
