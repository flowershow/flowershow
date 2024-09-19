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

  console.log("resource", resource);

  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resourcePath = resource.path; // absolute path as we store paths transformed to absolute paths in the db
  const host = req.nextUrl.host;
  const protocol = req.nextUrl.protocol;

  let rawFilePermalinkBase: string;

  // TODO there should be a better way to handle this
  if (site.customDomain) {
    rawFilePermalinkBase = `/_r/-`;
    // NOTE: aliases
    // temporary solution for our aliased sites
  } else if (site.user?.gh_username === "olayway") {
    if (site.gh_repository.startsWith("datasets/")) {
      rawFilePermalinkBase = `/core/${site.projectName}/_r/-`;
    } else if (site.projectName === "blog") {
      rawFilePermalinkBase = `/blog/_r/-`;
    } else if (site.projectName === "docs") {
      rawFilePermalinkBase = `/docs/_r/-`;
    } else if (site.projectName === "collections") {
      rawFilePermalinkBase = `/collections/_r/-`;
    } else {
      rawFilePermalinkBase = `/@${site.user.gh_username}/${site.projectName}/_r/-`;
    }
  } else if (
    site.user?.gh_username === "rufuspollock" &&
    site.projectName === "notes"
  ) {
    rawFilePermalinkBase = `/notes/_r/-`;
  } else {
    rawFilePermalinkBase = `/@${site.user!.gh_username}/${
      site.projectName
    }/_r/-`;
  }

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

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};
