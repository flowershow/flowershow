import { NextRequest, NextResponse } from "next/server";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { env } from "@/env.mjs";
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
      path?: string[];
    };
  },
) {
  const ctx = await createContext(req);
  const caller = appRouter.createCaller(ctx);
  // NOTE currently branch is not implemented and is always equal to "-"
  /* const { username, projectName, branch, slug } = params; */
  const { username, projectName, path } = params;

  if (!path || path.length === 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

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

  const R2FileUrl = `https://${env.NEXT_PUBLIC_R2_BUCKET_DOMAIN}/${site.id}/${
    site.gh_branch
  }/raw/${path.join("/")}`;

  return NextResponse.redirect(R2FileUrl, { status: 302 });
}

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};
