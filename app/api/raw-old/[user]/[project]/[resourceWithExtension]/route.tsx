import { NextRequest, NextResponse } from "next/server";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { PageMetadata, isDatasetPage } from "@/server/api/types";
import type { SiteWithUser } from "@/types";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";

/**
 * Creates the tRPC context required for API calls.
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      user: string;
      project: string;
      resourceWithExtension: string;
    };
  },
) {
  const ctx = await createContext(req);
  const caller = appRouter.createCaller(ctx);
  // NOTE currently branch is not implemented and is always equal to "-"
  /* const { username, projectName, branch, slug } = params; */
  const { user, project, resourceWithExtension } = params;

  let site: SiteWithUser | null = null;

  // NOTE: custom domains handling
  if (user === "_domain") {
    site = (await caller.site.getByDomain({
      domain: project,
    })) as SiteWithUser;
  } else {
    site = (await caller.site.get({
      gh_username: user,
      projectName: project,
    })) as SiteWithUser;
  }

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const match = resourceWithExtension.match(/^(.*)\.(.*)$/);

  if (!match) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const resourceNameOrId = match[1];
  const extension = match[2];

  if (!resourceNameOrId || !extension) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // find the resource in the datapackage (included in PageMetadata)
  const pageMetadata = (
    site.files as {
      [key: string]: PageMetadata;
    }
  )["/"]; // project home page; this route doesn't support nested datasets

  if (!pageMetadata || !isDatasetPage(pageMetadata)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resource =
    pageMetadata.resources.find(
      (r) => r.name === resourceNameOrId || r.id === resourceNameOrId,
    ) || pageMetadata.resources[parseInt(resourceNameOrId, 10)];

  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resourcePath = resource.path; // absolute path as we store paths transformed to absolute paths in the db
  const host = req.nextUrl.host;
  const protocol = req.nextUrl.protocol;

  const { customDomain, projectName, user: siteUser } = site;

  const gh_username = siteUser!.gh_username!;

  const rawFilePermalinkBase = customDomain
    ? `/_r/-`
    : resolveSiteAlias(`/@${gh_username}/${projectName}`, "to") + `/_r/-`;

  const rawFilePermalink = `${protocol}//${host}${rawFilePermalinkBase}/${resourcePath}`;

  // if extension same as in resource path, redirect to raw file permalink
  if (resourcePath.endsWith(`.${extension}`)) {
    return NextResponse.redirect(rawFilePermalink, { status: 301 });
  } else if (extension === "html") {
    return NextResponse.json(
      {
        error: `Resource previews are currently unavailable. You can download the original file using this link: ${rawFilePermalink}`,
      },
      { status: 400 },
    );
  } else {
    return NextResponse.json(
      {
        error: `Resource is not available in the requested format. You can download the original file using this link: ${rawFilePermalink}`,
      },
      { status: 400 },
    );
  }
}
