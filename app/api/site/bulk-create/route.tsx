import { NextRequest, NextResponse } from "next/server";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";

interface GhRepo {
  full_name: string; // e.g. "octocat/Hello-World"
  branch: string; // e.g. "main"
}

// TODO this doesn't work yet due to site.create being a protected route
/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

export async function POST(req: NextRequest) {
  // Create context and caller
  const ctx = await createContext(req);
  const caller = appRouter.createCaller(ctx);
  const sitesToInsert = (await req.json()) as GhRepo[];

  const failed: {
    full_name: string;
    branch: string;
    error: string;
  }[] = [];

  // Insert sites
  for (const site of sitesToInsert) {
    const [scope, repo] = site.full_name.split("/");
    if (!scope || !repo || !site.branch) {
      failed.push(
        Object.assign(site, {
          error: "Invalid site data. Must have full_name and branch.",
        }),
      );
      continue;
    }
    try {
      await caller.site.create({
        ghRepository: repo,
        ghBranch: site.branch,
      });
    } catch (e) {
      /* if (e instanceof TRPCError) {
       *     const httpCode = getHTTPStatusCodeFromError(e);
       *     failed.push(
       *         Object.assign(site, {
       *             error: e.message,
       *             httpCode
       *         })
       *     )
       * } */
      /* failed.push(
       *   Object.assign(site, {
       *     error: e.message,
       *   }),
       * ); */
      console.error(e);
    }
  }

  return NextResponse.json({
    failed,
  });
}
