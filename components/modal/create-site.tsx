"use client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
/* import { useFormStatus } from "react-dom"; */
import { cn } from "@/lib/utils";
import LoadingDots from "@/components/icons/loading-dots";
import { useModal } from "./provider";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { GithubIcon } from "@/components/icons";
import { signOut } from "next-auth/react";
import { env } from "@/env.mjs";
import { sendGTMEvent } from "@next/third-parties/google";

export default function CreateSiteModal() {
  const router = useRouter();
  const modal = useModal();

  const [data, setData] = useState({
    gh_scope: "",
    gh_repository: "",
    gh_branch: "main",
    rootDir: "",
  });

  /* useEffect(() => {
   *     setData((prev) => ({
   *         ...prev,
   *         subdomain: prev.name
   *             .toLowerCase()
   *             .trim()
   *             .replace(/[\W_]+/g, "-"),
   *     }));
   * }, [data.name]); */

  const {
    data: scopes,
    isLoading: isLoadingScopes,
    isError: isErrorFetchingScopes,
    error: errorFetchingScopes,
  } = api.user.getGitHubScopes.useQuery(undefined, {
    retry: 2,
  });

  const {
    data: repos,
    isLoading: isLoadingRepos,
    isError: isErrorFetchingRepos,
    error: errorFetchingRepos,
  } = api.user.getGitHubScopeRepos.useQuery(data.gh_scope, {
    retry: 2,
    enabled: !!data.gh_scope,
  });

  useEffect(() => {
    if (isErrorFetchingScopes) {
      toast.error(errorFetchingScopes.message);
      if (errorFetchingScopes.data?.code === "UNAUTHORIZED") {
        setTimeout(() => {
          signOut();
        }, 1000);
      }
    }
  }, [errorFetchingScopes]);

  useEffect(() => {
    if (isErrorFetchingRepos) {
      toast.error(errorFetchingRepos.message);
      if (errorFetchingRepos.data?.code === "UNAUTHORIZED") {
        setTimeout(() => {
          signOut();
        }, 1000);
      }
    }
  }, [errorFetchingRepos]);

  useEffect(() => {
    if (scopes) {
      if (scopes.length > 0) {
        setData({
          ...data,
          gh_scope: scopes[0]!.login || "",
        });
      }
    }
  }, [scopes]);

  useEffect(() => {
    if (repos) {
      const repositories = repos.map(({ name }) => name);
      if (repositories.length > 0) {
        setData({
          ...data,
          gh_repository: repositories[0] || "",
        });
      }
    }
  }, [repos]);

  const { isLoading: isCreatingSite, mutate: createSite } =
    api.site.create.useMutation({
      onSuccess: (res) => {
        /* if (env.NEXT_PUBLIC_VERCEL_ENV === "production") { */
        sendGTMEvent({
          event: "create_site",
          user_id: res.userId,
          site_id: res.id,
        });
        /* } */
        modal?.hide();
        router.push(`/site/${res.id}/settings`);
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
        if (error.data?.code === "UNAUTHORIZED") {
          setTimeout(() => {
            signOut();
          }, 3000);
        }
      },
    });

  return (
    <form
      data-testid="create-site-form"
      action={async (data: FormData) => {
        const gh_repository = data.get("gh_repository") as string;
        const gh_branch = data.get("gh_branch") as string;
        const rootDir = data.get("rootDir") as string;

        createSite({
          gh_repository,
          gh_branch,
          rootDir,
        });
      }}
      className="w-full rounded-md bg-white dark:bg-black md:max-w-md md:border md:border-stone-200 md:shadow dark:md:border-stone-700"
    >
      <div className="relative flex flex-col space-y-4 p-5 md:p-10">
        <h2 className="font-cal text-2xl dark:text-white">Create a new site</h2>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="gh_scope"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            <span className="flex items-center space-x-1">
              <GithubIcon className="h-4 w-4" />
              <span>GitHub Account</span>
            </span>
          </label>
          <select
            aria-label="GitHub Account"
            name="gh_scope"
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
            value={data.gh_scope}
            required
            placeholder="Select a GitHub account"
            disabled={!scopes}
            onChange={(e) =>
              setData({ ...data, gh_scope: e.target.value, gh_repository: "" })
            }
          >
            {!scopes && (
              <option value="" disabled>
                Loading...
              </option>
            )}
            {scopes &&
              scopes.map((scope) => (
                <option key={scope.login} value={scope.login}>
                  {scope.login}
                </option>
              ))}
          </select>
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://github.com/settings/connections/applications/${env.NEXT_PUBLIC_AUTH_GITHUB_ID}`}
          >
            <span className="flex items-center space-x-1 text-xs text-blue-500 hover:text-blue-800">
              <span>Manage app access</span>
            </span>
          </a>
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="gh_repository"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            <span>Repository</span>
          </label>
          <select
            aria-label="Repository"
            name="gh_repository"
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
            value={data.gh_repository}
            required
            placeholder="Select a repository"
            disabled={!data.gh_scope || !repos}
            onChange={(e) =>
              setData({ ...data, gh_repository: e.target.value })
            }
          >
            {(!scopes || !repos) && (
              <option value="" disabled>
                Loading...
              </option>
            )}
            {data.gh_scope &&
              repos &&
              repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="gh_branch"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            <span>Branch</span>
          </label>
          <input
            name="gh_branch"
            type="text"
            value={data.gh_branch}
            onChange={(e) => setData({ ...data, gh_branch: e.target.value })}
            maxLength={32}
            required
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="rootDir"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            <span>Root Dir</span>
          </label>
          <input
            name="rootDir"
            type="text"
            value={data.rootDir}
            onChange={(e) => setData({ ...data, rootDir: e.target.value })}
            maxLength={32}
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
          />

          <span className="flex items-center space-x-1 text-xs">
            The directory within your project, in which your content is located.
            Leave empty if you want to publish the whole repository.
          </span>
        </div>

        {/* <div className="flex flex-col space-y-2">
                    <label
                        htmlFor="subdomain"
                        className="text-sm font-medium text-stone-500"
                    >
                        Subdomain
                    </label>
                    <div className="flex w-full max-w-md">
                        <input
                            name="subdomain"
                            type="text"
                            placeholder="subdomain"
                            value={data.subdomain}
                            onChange={(e) => setData({ ...data, subdomain: e.target.value })}
                            autoCapitalize="off"
                            pattern="[a-zA-Z0-9\-]+" // only allow lowercase letters, numbers, and dashes
                            maxLength={32}
                            required
                            className="w-full rounded-l-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
                        />
                        <div className="flex items-center rounded-r-lg border border-l-0 border-stone-200 bg-stone-100 px-3 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400">
                            .{env.NEXT_PUBLIC_ROOT_DOMAIN}
                        </div>
                    </div>
                </div> */}

        {/* <div className="flex flex-col space-y-2">
                    <label
                        htmlFor="description"
                        className="text-sm font-medium text-stone-500"
                    >
                        Description
                    </label>
                    <textarea
                        name="description"
                        placeholder="Description about why my site is so awesome"
                        value={data.description}
                        onChange={(e) => setData({ ...data, description: e.target.value })}
                        maxLength={140}
                        rows={3}
                        className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black  focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
                    />
                </div> */}
      </div>
      <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800 md:px-10">
        <CreateSiteFormButton
          disabled={
            isLoadingScopes ||
            isLoadingRepos ||
            isErrorFetchingScopes ||
            isErrorFetchingRepos
          }
          pending={isCreatingSite}
        />
      </div>
    </form>
  );
}
function CreateSiteFormButton({ disabled = false, pending = false }) {
  /* const { pending } = useFormStatus(); // TODO this doesn't work */
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none",
        pending || disabled
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          : "border-black bg-black text-white hover:bg-white hover:text-black dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800",
      )}
      disabled={pending || disabled}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Create Site</p>}
    </button>
  );
}
