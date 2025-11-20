import * as path from "path";
import { env } from "../env.mjs";
import { slug } from "github-slugger";
import { customEncodeUrl } from "./url-encoder";

/**
 * Resolve href (page link) or src (asset link) path to URL path (or full URL for assets)
 * @param opts.target  - Value of the href or src (relative or absolute)
 * @param opts.originFilePath  - Absolute path to the file where the link is (you can skip it if it's a root level file (e.g. top config.json))
 * @param opts.prefix  - User site prefix (/@username/sitename) if not hosted on a custom domain.
 * @param opts.isSrc  - Whether it's an asset link (src)
 * @param opts.domain  - User site custom domain (only needed if isSrc==true)
 * @example
 * resolvePathToUrl({ target: "blog/post-abc", originFilePath: "/README.md", prefix: "/@john/acme" })
 * resolvePathToUrl({ target: "assets/image.jpg", originFilePath: "config.json", isSrc: true, domain: "john.com" })
 */
export const resolvePathToUrl = ({
  target,
  originFilePath = "/",
  sitePrefix = "",
  domain,
  commonMarkSpaceEncoded = false,
}: {
  target: string;
  originFilePath?: string;
  sitePrefix?: string;
  domain?: string | null;
  commonMarkSpaceEncoded?: boolean;
}) => {
  if (target.startsWith("http")) {
    return target;
  }

  // remove space encoding (required in CommonMark links)
  if (commonMarkSpaceEncoded) {
    target = target
      .split("/")
      .map((p) => p.replaceAll("%20", " "))
      .join("/");
  }

  const [, filePath = "", heading = ""] =
    target.match(/^(.*?)(?:#(.*))?$/u) || [];

  // Generate heading id if present
  const headingId = heading ? `#${slug(heading)}` : "";

  if (!filePath && headingId) {
    return headingId;
  }

  const [, , ext = ""] = filePath.match(/^(.+?)(?:\.([^.]+))?$/) ?? [];
  const isMarkdown = ext === "md" || ext === "mdx" || !ext;
  const useRawUrlPath = !isMarkdown;

  // normalize origin file path so that it always has a leading slash
  if (!originFilePath.startsWith("/")) {
    originFilePath = `/${originFilePath}`;
  }

  let resolvedPath = filePath;

  if (!filePath.startsWith("/")) {
    // convert relative link to absolute
    resolvedPath = path.resolve(path.dirname(originFilePath), filePath);
  }

  let resolvedUrlPath = resolvedPath
    .replace(/\.(mdx?|md)/, "")
    .replace(/\/?(index|README)$/, "");

  // remove trailing slash unless it's the root
  if (resolvedUrlPath !== "/" || sitePrefix) {
    resolvedUrlPath = resolvedUrlPath.replace(/\/$/, "");
  }

  // For src need to use full path so that it works with Next.js Image
  // otherwise Next.js will expect the file to be located in /public folder
  if (useRawUrlPath) {
    const isSecure =
      env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
      env.NEXT_PUBLIC_VERCEL_ENV === "preview";
    const protocol = isSecure ? "https" : "http";
    const encodedUrlPath = resolvedUrlPath
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/");

    return `${protocol}://${
      domain || env.NEXT_PUBLIC_ROOT_DOMAIN
    }${sitePrefix}/_r/-${encodedUrlPath}`;
  }

  const encodedUrlPath = resolvedUrlPath
    .split("/")
    .map((p) => customEncodeUrl(p))
    .join("/");
  return `${sitePrefix}${encodedUrlPath}${headingId}`;
};
