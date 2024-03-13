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

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  let hostname = req.headers
    .get("host")!
    .replace(".localhost:3000", `.${env.NEXT_PUBLIC_ROOT_DOMAIN}`);

  // special case for Vercel preview deployment URLs
  if (
    hostname.includes("---") &&
    hostname.endsWith(`.${process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)
  ) {
    hostname = `${hostname.split("---")[0]}.${env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  }

  const searchParams = req.nextUrl.searchParams.toString();
  // Get the pathname of the request (e.g. /, /about, /blog/first-post)
  const path = `${url.pathname}${
    searchParams.length > 0 ? `?${searchParams}` : ""
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
    // if path matches /blog/{restofpath} rewrite to /{mainAccount}/blog/{restofpath}
    if (path.match(/^\/blog/)) {
      return NextResponse.rewrite(new URL(`/${mainAccount}${path}`, req.url));
    }
    // if path matches /docs/{restofpath} rewrite to /{mainAccount}/docs/{restofpath}
    if (path.match(/^\/docs/)) {
      return NextResponse.rewrite(new URL(`/${mainAccount}${path}`, req.url));
    }
    // if path matches /collections/{restofpath} rewrite to /{mainAccount}/collections/{restofpath}
    if (path.match(/^\/collections/)) {
      return NextResponse.rewrite(new URL(`/${mainAccount}${path}`, req.url));
    }
    // if path matches /core/{restofpath} rewrite to /{mainAccount}/{restofpath}
    if (path.match(/^\/core/)) {
      const pathAfterCore = path.replace(/^\/core/, "");
      return NextResponse.rewrite(
        new URL(`/${mainAccount}${pathAfterCore}`, req.url),
      );
    }
    // if path matches /@{username}/{project}/{restofpath} rewrite to /{username}/{project}/{restofpath}}
    const match = path.match(/^\/@([^/]+)\/([^/]+)(.*)/);
    if (match) {
      return NextResponse.rewrite(
        new URL(`/${match[1]}/${match[2]}${match[3]}`, req.url),
      );
    }
    return NextResponse.rewrite(
      new URL(`/home${path === "/" ? "" : path}`, req.url),
    );
  }

  // rewrite all other domains and subdomains to /domain/{hostname}/{path}
  return NextResponse.rewrite(new URL(`/domain/${hostname}${path}`, req.url));
}
