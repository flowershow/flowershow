import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { githubFetch } from "@/lib/github";
import type {
  GitHubScope,
  GitHubAPIOrganization,
  GitHubAPIRepository,
  GitHubRepository,
} from "@/lib/github";
import { unstable_cache } from "next/cache";

export const userRouter = createTRPCRouter({
  getSites: protectedProcedure
    .input(z.object({ limit: z.number().min(1).optional() }).optional())
    .query(({ ctx, input }) => {
      return unstable_cache(
        async () => {
          return await ctx.db.site.findMany({
            where: { userId: ctx.session.user.id },
            take: input?.limit,
          });
        },
        [`user-${ctx.session.user.id}-sites`],
        {
          revalidate: 900, // 15 minutes
          tags: [`user-${ctx.session.user.id}-sites`],
        },
      )();
    }),
  getGitHubScopes: protectedProcedure.query<GitHubScope[]>(async ({ ctx }) => {
    const accessToken = ctx.session.accessToken;

    // Fetching organizations the user belongs to.
    // https://docs.github.com/en/rest/orgs/members?apiVersion=2022-11-28#list-organization-memberships-for-the-authenticated-user
    const orgsResponse = await githubFetch(`/user/orgs`, accessToken, {
      cache: "no-store",
    });
    const orgs = (await orgsResponse.json()) as GitHubAPIOrganization[];

    // Fetching the user's own account information.
    // https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
    const userResponse = await githubFetch(`/user`, accessToken, {
      cache: "no-store",
    });
    const user = await userResponse.json();

    // Combining both orgs and the user's GitHub login as selectable scopes.
    return [
      { login: user.login, type: "User", avatar_url: user.avatar_url },
    ].concat(
      orgs.map((org) => ({
        login: org.login,
        type: "Organization",
        avatar_url: org.avatar_url,
      })),
    ) as GitHubScope[];
  }),
  getGitHubScopeRepos: protectedProcedure
    .input(z.string())
    .query<GitHubRepository[]>(async ({ ctx, input: scope }) => {
      const accessToken = ctx.session.accessToken;
      let page = 1;
      let allRepos: GitHubRepository[] = [];
      let hasNextPage = false;
      let scopeReposUrl: string;

      let urlParams = new URLSearchParams({
        per_page: "100",
      });

      if (ctx.session.user.username !== scope) {
        // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-organization-repositories
        scopeReposUrl = `/orgs/${scope}/repos`;
        // urlParams.set('type', 'public');
      } else {
        // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repositories-for-the-authenticated-user
        scopeReposUrl = `/user/repos`;
        // NOTE: The GitHub API does not support filtering by both type and affiliation
        // so we need to filter out the user's private repos manually (at least until we support private repos).
        urlParams.set("affiliation", "owner,collaborator");
      }
      do {
        urlParams.set("page", `${page}`);
        const response = await githubFetch(
          `${scopeReposUrl}?${urlParams.toString()}`,
          accessToken,
          { cache: "no-store" },
        );
        const repos = (await response.json()) as GitHubAPIRepository[];
        allRepos = allRepos.concat(
          repos
            .filter((repo) => !repo.private)
            .map((repo) => ({
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              owner: repo.owner.login,
            })),
        );

        const linkHeader = response.headers.get("link");
        hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;
        page++;
      } while (hasNextPage);

      // sort alphabetically by name
      allRepos.sort((a, b) => a.name.localeCompare(b.name));

      return allRepos;
    }),
});
