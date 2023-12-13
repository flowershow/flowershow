"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import LoadingDots from "@/components/icons/loading-dots";
import { useModal } from "./provider";
import va from "@vercel/analytics";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { GithubIcon } from "lucide-react";


export default function CreateSiteModal() {
    const router = useRouter();
    const modal = useModal();

    const [data, setData] = useState({
        gh_scope: "",
        gh_repository: "",
        gh_branch: "main",
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

    const { data: orgsReposMap } = api.user.getGitHubOrgsToReposMap.useQuery();

    useEffect(() => {
        if (orgsReposMap) {
            const scopes = Object.keys(orgsReposMap);
            if (scopes.length > 0) {
                setData(
                    {
                        ...data,
                        gh_scope: scopes[0] || "",
                    }
                );
            }
        }
    }, [orgsReposMap]);


    const createSiteMutation = api.site.create.useMutation({
        onSuccess: (res) => {
            va.track("Created Site");
            const { id } = res;
            router.refresh();
            router.push(`/site/${id}/settings`);
            modal?.hide();
            toast.success(`Successfully created site!`);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const createSite = (formData: FormData) => {
        const gh_repository = formData.get("gh_repository") as string;
        const gh_branch = formData.get("gh_branch") as string;
        const gh_scope = formData.get("gh_scope") as string;

        createSiteMutation.mutate({
            gh_repository,
            gh_branch,
            gh_scope,
        });
    };

    return (
        <form
            action={async (data: FormData) => createSite(data)}
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
                            <span>
                                GitHub Account
                            </span>
                        </span>
                    </label>
                    <select
                        name="gh_scope"
                        className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
                        autoFocus
                        value={data.gh_scope}
                        required
                        placeholder="Select a GitHub account"
                        disabled={!orgsReposMap}
                        onChange={(e) => setData({ ...data, gh_scope: e.target.value, gh_repository: "" })}
                    >
                        {!orgsReposMap && (
                            <option value="" disabled>
                                Loading...
                            </option>
                        )}
                        {orgsReposMap && Object.keys(orgsReposMap).map((scope) => (
                            <option key={scope} value={scope}>
                                {scope}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col space-y-2">
                    <label
                        htmlFor="gh_scope"
                        className="text-sm font-medium text-stone-500 dark:text-stone-400"
                    >
                        <span>
                            Repository
                        </span>
                    </label>
                    <select
                        name="gh_repository"
                        className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
                        autoFocus
                        value={data.gh_repository}
                        required
                        placeholder="Select a repository"
                        disabled={!data.gh_scope}
                        onChange={(e) => setData({ ...data, gh_repository: e.target.value })}
                    >
                        {!data.gh_repository && (
                            <option value="" disabled>
                                --- Select a repository ---
                            </option>
                        )}
                        {data.gh_scope && orgsReposMap![data.gh_scope]!.map((repo) => (
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
                        <span>
                            Branch
                        </span>
                    </label>
                    <input
                        name="gh_branch"
                        type="text"
                        autoFocus
                        value={data.gh_branch}
                        onChange={(e) => setData({ ...data, gh_branch: e.target.value })}
                        maxLength={32}
                        required
                        className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
                    />
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
                <CreateSiteFormButton />
            </div>
        </form>
    );
}
function CreateSiteFormButton() {
    const { pending } = useFormStatus();
    return (
        <button
            className={cn(
                "flex h-10 w-full items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none",
                pending
                    ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    : "border-black bg-black text-white hover:bg-white hover:text-black dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800",
            )}
            disabled={pending}
        >
            {pending ? <LoadingDots color="#808080" /> : <p>Create Site</p>}
        </button>
    );
}
