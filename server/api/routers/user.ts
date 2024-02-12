import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const githubAPIBaseURL = 'https://api.github.com';
const githubAPIVersion = '2022-11-28';

const makeGitHubHeaders = (accessToken) => {
  return {
    'X-GitHub-Api-Version': githubAPIVersion,
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github+json',
  };
};

async function githubFetch(url, accessToken) {
  const response = await fetch(url, {
    headers: makeGitHubHeaders(accessToken),
  });
  if (!response.ok) {
    const statusCode = response.status;
    switch (statusCode) {
      case 401:
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid GitHub access token. Signing out...",
        });
      case 403:
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access to the GitHub resource is forbidden.",
        });
      default:
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch from GitHub: ${response.statusText}`,
        });
    }
  }
  return response;
}

interface GitHubAPIOrganization {
  login: string;
  id: number;
  node_id: string;
  url: string;
  repos_url: string;
  avatar_url: string;
  description: string | null;
  // ...
}

interface GitHubAPIRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  owner: {
    login: string;
  }
}

interface GitHubScope {
  login: string;
  type: "user" | "organization";
  avatar_url: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
}


export const userRouter = createTRPCRouter({
  getGitHubScopes: protectedProcedure.query<GitHubScope[]>(async ({ ctx }) => {
    const accessToken = ctx.session.accessToken;

    // Fetching organizations the user belongs to.
    // https://docs.github.com/en/rest/orgs/members?apiVersion=2022-11-28#list-organization-memberships-for-the-authenticated-user
    const orgsResponse = await githubFetch(`${githubAPIBaseURL}/user/orgs`, accessToken);
    const orgs = (await orgsResponse.json()) as GitHubAPIOrganization[];

    // Fetching the user's own account information.
    // https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
    const userResponse = await githubFetch(`${githubAPIBaseURL}/user`, accessToken);
    const user = (await userResponse.json());

    // Combining both orgs and the user's GitHub login as selectable scopes.
    return [{ login: user.login, type: 'User', avatar_url: user.avatar_url }].concat(
      orgs.map((org) => ({ login: org.login, type: 'Organization', avatar_url: org.avatar_url }))
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
        per_page: '100',
      });

      if (ctx.session.user.username !== scope) {
        // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-organization-repositories
        scopeReposUrl = `${githubAPIBaseURL}/orgs/${scope}/repos`;
        // urlParams.set('type', 'public');
      } else {
        // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repositories-for-the-authenticated-user
        scopeReposUrl = `${githubAPIBaseURL}/user/repos`;
        // NOTE: The GitHub API does not support filtering by both type and affiliation
        // so we need to filter out the user's private repos manually (at least until we support private repos).
        urlParams.set('affiliation', 'owner,collaborator');
      }
      do {
        urlParams.set('page', `${page}`);
        const response = await githubFetch(`${scopeReposUrl}?${urlParams.toString()}`, accessToken);
        const repos = (await response.json()) as GitHubAPIRepository[];
        allRepos = allRepos.concat(
          repos
            .filter((repo) => !repo.private)
            .map((repo) => ({
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              owner: repo.owner.login,
            }))
        );

        const linkHeader = response.headers.get('link');
        hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;
        page++;
      } while (hasNextPage);

      // sort alphabetically by name
      allRepos.sort((a, b) => a.name.localeCompare(b.name));

      return allRepos;
    }),
});


