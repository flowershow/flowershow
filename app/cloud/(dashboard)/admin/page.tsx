import { notFound, redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { getSession } from "@/server/auth";
import BulkCreateForm from "@/app/cloud/(dashboard)/admin/_components/bulk-create";
import SitesAdminTable from "@/app/cloud/(dashboard)/admin/_components/sites-table";

export default async function AdminPanel() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    notFound();
  }

  const bulkCreateSites = async (formData: FormData) => {
    "use server";
    const sitesJson = formData.get("sitesData");
    if (!sitesJson) {
      throw new Error("No repos provided");
    }
    let sites;
    try {
      sites = JSON.parse(sitesJson as string);
    } catch (e) {
      throw new Error("Invalid JSON");
    }
    if (!Array.isArray(sites)) {
      throw new Error("Invalid input. Expected array of objects");
    }
    const failedSites: {
      error: string;
      input: any;
    }[] = [];

    for (const site of sites) {
      if (!isValidSiteData(site)) {
        failedSites.push({
          input: site,
          error: "Invalid input",
        });
        continue;
      }
      const { ghRepository, ghBranch, rootDir, projectName } = site;

      try {
        await api.site.create.mutate({
          ghRepository,
          ghBranch,
          rootDir,
          projectName,
        });
      } catch (e) {
        if (e instanceof Error) {
          failedSites.push({
            input: site,
            error: e.message,
          });
        } else {
          failedSites.push({
            input: site,
            error: "Unknown error",
          });
        }
      }
    }

    if (failedSites.length > 0) {
      return {
        message: "Some sites failed to create",
        body: failedSites,
      };
    }
    return {
      message: "All sites created successfully",
    };
  };

  return (
    <div className="flex flex-col space-y-6">
      <BulkCreateForm handleSubmit={bulkCreateSites} />
      <SitesAdminTable />
    </div>
  );
}

interface SiteData {
  ghRepository: string; // e.g. "octocat/Hello-World"
  ghBranch: string; // e.g. "main"
  rootDir: string;
  projectName: string;
}

const isValidSiteData = (x: any): x is SiteData => {
  return (
    typeof x.ghRepository === "string" &&
    typeof x.ghBranch === "string" &&
    typeof x.rootDir === "string" &&
    typeof x.projectName === "string"
  );
};
