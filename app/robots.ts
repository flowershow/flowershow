import type { MetadataRoute } from "next";
import { env } from "@/env.mjs";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/sitemap.xml`,
  };
}
