import { env } from "@/env.mjs";
import { SiteWithUser } from "@/types";
import { resolveSiteAlias } from "./resolve-site-alias";

export default function getSiteUrl(site: SiteWithUser) {
  const { projectName, user, customDomain } = site;

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
    env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  const protocol = isSecure ? "https" : "http";

  if (customDomain) {
    return `${protocol}://${site.customDomain}`;
  } else {
    const ghUsername = user!.ghUsername!;
    const sitePath = resolveSiteAlias(`/@${ghUsername}/${projectName}`, "to");
    return `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${sitePath}`;
  }
}

export function getSiteUrlPath(site: SiteWithUser) {
  const { projectName, user, customDomain } = site;

  if (customDomain) {
    return "";
  } else {
    const ghUsername = user!.ghUsername!;
    return resolveSiteAlias(`/@${ghUsername}/${projectName}`, "to");
  }
}
