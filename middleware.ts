import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/env.mjs";

const mainAccount = "olayway"; // temporary

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

  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  let hostname = req.headers
    .get("host")!
    .replace(".localhost:3000", `.${env.NEXT_PUBLIC_ROOT_DOMAIN}`);

  // special case for Vercel preview deployment URLs
  if (hostname.endsWith(`.${env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)) {
    hostname = `${env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  }

  const searchParams = req.nextUrl.searchParams.toString();
  // Translate + to %20 (our custom space encoding for better UX),
  // otherwise it will get encoded as %2B
  // https://github.com/datopian/datahub/issues/1172
  const pathname = url.pathname.replace(/\+/g, "%20");
  const path = `${pathname}${searchParams.length > 0 ? `?${searchParams}` : ""
    }`;

  // rewrites for cloud pages
  if (
    hostname == `cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}` ||
    hostname == `staging-cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}`
  ) {
    const session = await getToken({ req });

    if (!session && path !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    } else if (session && path == "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.rewrite(
      // temporarily direct users directly to /sites instead of dashboard home page
      new URL(`/cloud${path === "/" ? "/sites" : path}`, req.url),
    );
  }

  // rewrites for root domain
  if (
    hostname === `${env.NEXT_PUBLIC_ROOT_DOMAIN}` ||
    hostname === `staging.${env.NEXT_PUBLIC_ROOT_DOMAIN}`
  ) {
    if (
      path.match(/^\/blog/) ||
      path.match(/^\/docs/) ||
      path.match(/^\/collections/)
    ) {
      if (path.match(/\/datapackage\.(json|yaml|yml)$/)) {
        return NextResponse.rewrite(
          new URL(`/api/${mainAccount}${path}`, req.url),
        );
      }
      return NextResponse.rewrite(new URL(`/${mainAccount}${path}`, req.url));
    }
    // if path ends with /abc/r/restof/path redirect to /abc
    if (path.match(/\/r\/.+$/)) {
      return NextResponse.redirect(
        new URL(path.replace(/\/r\/.+$/, ""), req.url),
      );
    }
    // if path ends with /abc/r/restof/path redirect to /abc
    if (path.match(/\/view\/.+$/)) {
      return NextResponse.redirect(
        new URL(path.replace(/\/view\/.+$/, ""), req.url),
      );
    }
    if (path.match(/^\/awesome/)) {
      // redirect to collections
      return NextResponse.redirect(
        new URL(path.replace("/awesome", "/collections"), req.url),
      );
    }
    if (path.match(/^\/notes/)) {
      return NextResponse.rewrite(
        new URL(path.replace("/notes", "/rufuspollock/data-notes"), req.url),
      );
    }
    if (path.match(/^\/core/)) {
      const pathAfterCore = path.replace(/^\/core/, "");
      if (path.match(/\/datapackage\.(json|yaml|yml)$/)) {
        return NextResponse.rewrite(
          new URL(`/api/${mainAccount}${pathAfterCore}`, req.url),
        );
      }
      return NextResponse.rewrite(
        new URL(`/${mainAccount}${pathAfterCore}`, req.url),
      );
    }
    // if path matches /@{username}/{project}/{restofpath} rewrite to /{username}/{project}/{restofpath}}
    const match = path.match(/^\/@([^/]+)\/([^/]+)(.*)/);
    if (match) {
      // if path matches /.../datapackage.json/yaml/yml rewrite to /api/datapackage/{path}
      if (path.match(/\/datapackage\.(json|yaml|yml)$/)) {
        return NextResponse.rewrite(
          new URL(`/api/${match[1]}/${match[2]}${match[3]}`, req.url),
        );
      }

      return NextResponse.rewrite(
        new URL(`/${match[1]}/${match[2]}${match[3]}`, req.url),
      );
    }
    return NextResponse.rewrite(
      new URL(`/home${path === "/" ? "" : path}`, req.url),
    );
  }

  // if path matches /.../datapackage.json/yaml/yml rewrite to /api/datapackage/{path}
  if (path.match(/\/datapackage\.(json|yaml|yml)$/)) {
    return NextResponse.rewrite(
      new URL(`/api/domain/${hostname}${path}`, req.url),
    );
  }

  // rewrite all other domains and subdomains to /domain/{hostname}/{path}
  return NextResponse.rewrite(new URL(`/_domain/${hostname}${path}`, req.url));
}
