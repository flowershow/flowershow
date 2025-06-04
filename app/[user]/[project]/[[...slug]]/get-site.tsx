import { SiteWithUser } from "@/types";
import { api } from "@/trpc/server";
import { notFound, redirect } from "next/navigation";

export async function getSite(
  user: string,
  project: string,
): Promise<SiteWithUser> {
  let site: SiteWithUser | null = null;

  if (user === "_domain") {
    site = await api.site.getByDomain.query({
      domain: project,
    });
  } else {
    site = await api.site.get.query({
      gh_username: user,
      projectName: project,
    });
  }

  if (!site) {
    notFound();
  }

  // Redirect to custom domain if it exists
  if (user !== "_domain" && site.customDomain) {
    return redirect(`https://${site.customDomain}`);
  }

  return site;
}
