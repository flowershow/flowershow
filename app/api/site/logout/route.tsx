import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/server/db";
import { SITE_ACCESS_COOKIE_NAME } from "@/lib/const";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteid") ?? "";

  const site = await prisma.site.findUnique({
    where: {
      id: siteId,
    },
    include: {
      user: {
        select: {
          ghUsername: true,
        },
      },
    },
  });

  console.log({ siteId, site });

  if (!site) return NextResponse.json({ success: true }); // nothing to clear

  // must match original attributes (path, sameSite, secure, domain if set)
  (await cookies()).set({
    name: SITE_ACCESS_COOKIE_NAME(site.id),
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0, // delete
    ...(site.customDomain
      ? { domain: site.customDomain }
      : {
          path: `/@${site.user.ghUsername}/${site.projectName}`, // scope to this site segment
        }),
  });

  return NextResponse.json({ success: true });
}
