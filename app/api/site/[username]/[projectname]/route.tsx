import { NextRequest, NextResponse } from "next/server";
import { InternalSite, internalSiteSelect } from "@/lib/db/internal";
import prisma from "@/server/db";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      username: string;
      projectname: string;
    };
  },
) {
  const { username, projectname } = params;
  let site: InternalSite | null = null;

  if (username === "_domain") {
    site = await prisma.site.findUnique({
      where: {
        customDomain: projectname,
      },
      select: internalSiteSelect,
    });
  } else {
    site = await prisma.site.findFirst({
      where: {
        user: {
          ghUsername: username,
        },
        projectName: projectname,
      },
      select: internalSiteSelect,
    });
  }

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(site);
}
