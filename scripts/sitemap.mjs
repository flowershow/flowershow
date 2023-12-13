import { writeFileSync } from "fs";
import { globby } from "globby";
import prettier from "prettier";

import config from "../content/config.mjs";
import clientPromise from "../lib/mddb.mjs";

export default async function sitemap() {
  const prettierConfig = await prettier.resolveConfig("");
  const mddb = await clientPromise;
  const allFiles = await mddb.getFiles({ extensions: ["mdx", "md"] });
  const contentPages = allFiles
    .filter((x) => !x.metadata?.isDraft)
    .map((x) => `/${x.url_path}`);
  const pages = await globby([
    "pages/*.(js|tsx)",
    "!pages/_*.(js|tsx)",
    "!pages/api",
    "!pages/404.(js|tsx)",
    "!pages/**/\\[\\[*\\]\\].(js|tsx)", // pages/[[...slug]].tsx
  ]);

  const siteUrl = config?.domain?.replace(/\/$/, "");

  const sitemap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${pages
        .concat(contentPages)
        .map((page) => {
          const path = page
            .replace("pages/", "/")
            .replace("public/", "/")
            .replace(/\.js|.tsx|.mdx|.md[^\/.]+$/, "")
            .replace("/feed.xml", "");
          const route = path === "/index" ? "" : path;
          return `
            <url>
              <loc>${siteUrl}${route}</loc>
            </url>
          `;
        })
        .join("")}
    </urlset>
  `;

  const formatted = prettier.format(sitemap, {
    ...prettierConfig,
    parser: "html",
  });

  if (siteUrl) {
    writeFileSync("public/sitemap.xml", formatted);
    console.log("Sitemap generated...");
  }
}
