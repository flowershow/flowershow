import type { MetadataRoute } from "next";
import { env } from "@/env.mjs";

export default function robots(): MetadataRoute.Robots {
  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
    env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  const protocol = isSecure ? "https" : "http";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}/sitemap.xml`,
  };
}
