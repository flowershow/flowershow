import { env } from "@/env.mjs";
import prisma from "@/server/db";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { hostname: string } },
) {
  const { hostname } = params;

  const site = await prisma.site.findFirst({
    where: {
      customDomain: hostname,
    },
  });

  if (!site) {
    return new Response("Not found", { status: 404 });
  }

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
    env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  const protocol = isSecure ? "https" : "http";

  const robotsTxt = `# ${protocol}://${hostname}
User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${protocol}://${hostname}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
