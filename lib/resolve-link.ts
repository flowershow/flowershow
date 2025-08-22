import * as path from "path";
import { env } from "@/env.mjs";

/**
 * Resolve href (page link) or src (asset link) path to URL path (or full URL for assets)
 * @param opts.target  - Value of the href or src (relative or absolute)
 * @param opts.originFilePath  - Absolute path to the file where the link is (you can skip it if it's a root level file (e.g. top config.json))
 * @param opts.prefix  - User site prefix (/@username/sitename) if not hosted on a custom domain.
 * @param opts.isSrc  - Whether it's an asset link (src)
 * @param opts.domain  - User site custom domain (only needed if isSrc==true)
 * @example
 * resolveLinkToUrl({ target: "blog/post-abc", originFilePath: "/README.md", prefix: "/@john/acme" })
 * resolveLinkToUrl({ target: "assets/image.jpg", originFilePath: "config.json", isSrc: true, domain: "john.com" })
 */
export const resolveLinkToUrl = ({
  target,
  originFilePath = "/",
  prefix = "",
  isSrcLink = false,
  domain,
}: {
  target: string;
  originFilePath?: string;
  prefix?: string;
  isSrcLink?: boolean;
  domain?: string | null;
}) => {
  if (target.startsWith("http")) {
    return target;
  }

  if (target.startsWith("#")) {
    return target;
  }

  let resolvedLink = target;

  resolvedLink = resolvedLink
    .replace(/\.mdx?$/, "")
    .replace(/\/(README|index)$/, "");

  // normalize origin file path so that it always has a leading slash
  if (!originFilePath.startsWith("/")) {
    originFilePath = `/${originFilePath}`;
  }

  // convert relative link to absolute
  if (!resolvedLink.startsWith("/")) {
    resolvedLink = path.resolve(path.dirname(originFilePath), resolvedLink);
  }

  // const prefix = prefix && resolveSiteAlias(prefix, "to");

  // remove trailing slash unless it's the root
  if (resolvedLink !== "/") {
    resolvedLink = resolvedLink.replace(/\/$/, "");
  }

  // For src need to use full path so that it works with Next.js Image
  // otherwise Next.js will expect the file to be located in /public folder
  if (isSrcLink) {
    const isSecure =
      env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
      env.NEXT_PUBLIC_VERCEL_ENV === "preview";
    const protocol = isSecure ? "https" : "http";
    return `${protocol}://${
      domain || env.NEXT_PUBLIC_ROOT_DOMAIN
    }${prefix}/_r/-${resolvedLink}`;
  }

  return `${prefix}${resolvedLink}`;
};
