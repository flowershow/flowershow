import { notFound, redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { getSession } from "@/server/auth";
import BulkCreateForm from "@/components/form/bulk-create-form";
import SitesAdminTable from "@/components/sites-admin-table";

export default async function AdminPanel() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    notFound();
  }

  const sites = await api.site.getAll.query();

  const forceSyncSite = async (id: string) => {
    "use server";
    await api.site.sync.mutate({
      id,
      force: true,
    });
  };

  // TODO extract into a trpc procedure
  const bulkCreateSites = async (formData: FormData) => {
    "use server";
    const repos = formData.get("repos");
    if (!repos) {
      throw new Error("No repos provided");
    }
    let reposJson;
    try {
      reposJson = JSON.parse(repos as string);
    } catch (e) {
      throw new Error("Invalid JSON");
    }
    if (!Array.isArray(reposJson)) {
      throw new Error("Invalid input. Expected array of objects");
    }
    const failedRepos: {
      error: string;
      input: any;
    }[] = [];

    reposJson.forEach(() => {});

    for (const repo of reposJson) {
      if (!isValidGhRepo(repo)) {
        failedRepos.push({
          input: repo,
          error: "Invalid input",
        });
        continue;
      }
      const [gh_scope, gh_repository] = repo.full_name.split("/");
      const gh_branch = repo.branch;
      if (
        typeof gh_scope !== "string" ||
        typeof gh_repository !== "string" ||
        typeof gh_branch !== "string"
      ) {
        failedRepos.push({
          input: repo,
          error: "Invalid input",
        });
        continue;
      }
      try {
        await api.site.create.mutate({
          gh_repository: repo.full_name,
          gh_branch: repo.branch,
        });
      } catch (e) {
        if (e instanceof Error) {
          failedRepos.push({
            input: repo,
            error: e.message,
          });
        } else {
          failedRepos.push({
            input: repo,
            error: "Unknown error",
          });
        }
      }
    }

    if (failedRepos.length > 0) {
      return {
        message: "Some sites failed to create",
        body: failedRepos,
      };
    }
    return {
      message: "All sites created successfully",
    };
  };

  return (
    <div className="flex flex-col space-y-6">
      <BulkCreateForm handleSubmit={bulkCreateSites} />
      <SitesAdminTable onSync={forceSyncSite} sites={sites} />
    </div>
  );
}

interface GhRepo {
  full_name: string; // e.g. "octocat/Hello-World"
  branch: string; // e.g. "main"
}

const isValidGhRepo = (x: any): x is GhRepo => {
  return typeof x.full_name === "string" && typeof x.branch === "string";
};
