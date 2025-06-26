import { NextRequest, NextResponse } from "next/server";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { fetchFile } from "@/lib/content-store";
import { TRPCError } from "@trpc/server";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

export async function GET(
  req: NextRequest,
  { params }: { params: { domain: string; slug?: string[] } },
) {
  const ctx = await createContext(req);
  const caller = appRouter.createCaller(ctx);
  const { domain, slug } = params;

  if (!slug) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const site = await caller.site.getByDomain({
    domain,
  });

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await fetchFile({
      projectId: site.id,
      branch: site.ghBranch,
      path: slug.join("/"),
    });

    return new Response(file, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
