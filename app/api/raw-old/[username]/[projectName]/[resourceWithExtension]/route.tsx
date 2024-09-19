import { NextRequest, NextResponse } from "next/server";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { PageMetadata, isDatasetPage } from "@/server/api/types";
import { Site } from "@prisma/client";

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
      username: string;
      projectName: string;
      resourceWithExtension: string;
    };
  },
) {
  const ctx = await createContext(req);
  const caller = appRouter.createCaller(ctx);
  // NOTE currently branch is not implemented and is always equal to "-"
  /* const { username, projectName, branch, slug } = params; */
  const { username, projectName, resourceWithExtension } = params;

  let site: SiteWithUser | null = null;

  if (username === "_domain") {
    site = await caller.site.getByDomain({
      domain: projectName,
    });
  } else {
    site = await caller.site.get({
      gh_username: username!,
      projectName: projectName!,
    });
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

  // find the resource in the datapackage (included in PageMetadata)
  const pageMetadata = (
    site.files as {
      [key: string]: PageMetadata;
    }
  )["/"]; // project home page; this route doesn't support nested datasets

  if (!pageMetadata || !isDatasetPage(pageMetadata)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resource = pageMetadata.resources.find(
    (r) => r.name === resourceNameOrId || r.id === resourceNameOrId,
  );

  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resourcePath = resource.path; // absolute path as we store paths transformed to absolute paths in the db
  const host = req.nextUrl.host;
  const protocol = req.nextUrl.protocol;
  const rawFilePermalink = `${protocol}//${host}/@${username}/${projectName}/_r/-/${resourcePath}`;

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

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};
