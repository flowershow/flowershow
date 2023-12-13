import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";


export const userRouter = createTRPCRouter({
  // getGitHubOrgs: protectedProcedure.query<string[]>(async ({ ctx }) => {
  //   // Query the database to get the user's GitHub access token
  //   const user = await ctx.db.user.findUnique({
  //     where: { id: ctx.session.user.id },
  //     include: { accounts: true },
  //   });

  //   const githubAccount = user?.accounts.find(
  //     (account) => account.provider === "github",
  //   );

  //   const accessToken = githubAccount?.access_token;

  //   if (!accessToken) {
  //     throw new Error("GitHub access token not found");
  //   }

  //   return await fetchAuthUserOrgs(accessToken);
  // }),
  getGitHubRepositories: protectedProcedure.query<GitHubRepository[]>(
    async ({ ctx }) => {
      // Query the database to get the user's GitHub access token
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { accounts: true },
      });

      const githubAccount = user?.accounts.find(
        (account) => account.provider === "github",
      );

      const accessToken = githubAccount?.access_token;

      if (!accessToken) {
        throw new Error("GitHub access token not found");
      }

      return await fetchAuthUserRepositories(accessToken);
    },
  ),
  // TODO TEMPORARY SOLUTION until we can fetch athenticated user's orgs
  // https://github.com/orgs/community/discussions/74804
  getGitHubOrgsToReposMap: protectedProcedure.query<{ [key: string]: GitHubRepository[] }>(
    async ({ ctx }) => {
      // Query the database to get the user's GitHub access token
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { accounts: true },
      });

      const githubAccount = user?.accounts.find(
        (account) => account.provider === "github",
      );

      const accessToken = githubAccount?.access_token;

      if (!accessToken) {
        throw new Error("GitHub access token not found");
      }

      const repos = await fetchAuthUserRepositories(accessToken);

      return repos.reduce((acc, repo) => {
        const org = repo.full_name.split("/")[0] as string;
        if (!acc[org]) {
          acc[org] = [];
        }
        acc[org]!.push(repo);
        return acc;
      }
        , {} as { [key: string]: GitHubRepository[] });
    },
  ),
});




// async function fetchAuthUserOrgs(accessToken: string) {
//   const response = await fetch(
//     // List organizations for the authenticated user
//     // https://docs.github.com/en/free-pro-team@latest/rest/orgs/members?apiVersion=2022-11-28#list-organization-memberships-for-the-authenticated-user
//     "https://api.github.com/user/memberships/orgs?state=active",
//     {
//       headers: {
//         'X-GitHub-Api-Version': '2022-11-28',
//         'Authorization': `Bearer ${accessToken}`,
//         "Accept": "application/vnd.github+json"
//       },
//     }
//   );

//   if (!response.ok) {
//     throw new Error(
//       `Failed to fetch GitHub organizations: ${response.statusText}`,
//     );
//   }

//   const orgs = (await response.json()) as any[];

//   console.log("USER ORGS", orgs);

//   return orgs.map((org) => org.login);
// }

async function fetchAuthUserRepositories(accessToken: string) {
  const perPage = 100; // Max number of items per page
  let page = 1; // Start at page 1
  let allRepos: GitHubRepository[] = []; // Array to hold all repositories
  let repos: GitHubAPIRepository[] // Temp variable to hold response

  do {
    // Fetch current page of repositories
    const response = await fetch(
      // List repositories for the authenticated user
      // https://docs.github.com/en/free-pro-team@latest/rest/repos/repos?apiVersion=2022-11-28#list-repositories-for-the-authenticated-user
      `https://api.github.com/user/repos?visibility=public&per_page=${perPage}&page=${page}`,
      {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch GitHub repositories: ${response.statusText}`,
      );
    }

    repos = (await response.json()) as GitHubAPIRepository[];

    const reposSanitized = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
    } as GitHubRepository));

    allRepos = allRepos.concat(reposSanitized);
    page++;

  } while (repos.length === perPage);

  return allRepos;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
}


interface GitHubAPIRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  [key: string]: unknown;
}
