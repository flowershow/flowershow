import { TRPCError } from "@trpc/server";

const githubAPIBaseURL = "https://api.github.com";
const githubAPIVersion = "2022-11-28";

type Accept = "application/vnd.github+json" | "application/vnd.github.raw+json";

const makeGitHubHeaders = ({
  accessToken,
  accept = "application/vnd.github+json",
}: {
  accessToken?: string;
  accept?: Accept;
}): HeadersInit => {
  const headers: Record<string, string> = {
    "X-GitHub-Api-Version": githubAPIVersion,
    Accept: accept,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

const githubFetch = async ({
  url,
  accessToken,
  cacheOptions,
  accept,
}: {
  url: string;
  accessToken?: string;
  cacheOptions?: { next?: any; cache?: any };
  accept?: Accept;
}) => {
  const response = await fetch(`${githubAPIBaseURL}${url}`, {
    headers: makeGitHubHeaders({ accessToken, accept }),
    ...cacheOptions,
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
      case 404:
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `GitHub resource not found: ${response.statusText}`,
        });
      default:
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch from GitHub: ${response.statusText}`,
        });
    }
  }
  return response;
};

const githubJsonFetch = async <T>({
  url,
  accessToken,
  cacheOptions,
}: {
  url: string;
  accessToken?: string;
  cacheOptions?: { next?: any; cache?: any };
}) => {
  const response = await githubFetch({
    url,
    accessToken,
    cacheOptions,
  });
  return response.json() as Promise<T>;
};

const githubRawFetch = async ({
  url,
  accessToken,
  cacheOptions,
}: {
  url: string;
  accessToken: string;
  cacheOptions?: { next?: any; cache?: any };
}) => {
  const response = await githubFetch({
    url,
    accessToken,
    cacheOptions,
    accept: "application/vnd.github.raw+json",
  });

  return response.blob();
};

export const fetchGitHubScopes = async (accessToken: string) => {
  // Fetching organizations the user is a member of.
  // https://docs.github.com/en/rest/orgs/orgs?apiVersion=2022-11-28#list-organizations-for-the-authenticated-user
  const orgs = await githubJsonFetch<GitHubAPIOrganization[]>({
    url: `/user/orgs`,
    accessToken,
    cacheOptions: {
      cache: "no-store",
    },
  });

  // Fetching the user's own account information.
  // https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
  const user = await githubJsonFetch<GitHubAPIUser>({
    url: `/user`,
    accessToken,
    cacheOptions: {
      cache: "no-store",
    },
  });

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
};

export const fetchGitHubScopeRepositories = async ({
  scope = "self",
  accessToken,
}: {
  scope: "self" | string; // self means the user's own repositories
  accessToken: string;
}) => {
  let page = 1;
  let allRepos: GitHubRepository[] = [];
  let hasNextPage = false;
  let scopeReposUrl: string;

  const urlParams = new URLSearchParams({
    per_page: "100",
  });

  if (scope === "self") {
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repositories-for-the-authenticated-user
    scopeReposUrl = `/user/repos`;
    urlParams.set("affiliation", "owner,collaborator");
  } else {
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-organization-repositories
    scopeReposUrl = `/orgs/${scope}/repos`;
  }
  do {
    urlParams.set("page", `${page}`);
    const response = await githubFetch({
      url: `${scopeReposUrl}?${urlParams.toString()}`,
      accessToken,
      cacheOptions: {
        cache: "no-store",
      },
    });
    const repos = (await response.json()) as GitHubAPIRepository[];
    allRepos = allRepos.concat(
      repos.map((repo) => ({
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
};

export const fetchGitHubRepoTree = async ({
  gh_repository,
  gh_branch,
  access_token,
}: {
  gh_repository: string;
  gh_branch: string;
  access_token: string;
}) => {
  try {
    return await githubJsonFetch<GitHubAPIRepoTree>({
      url: `/repos/${gh_repository}/git/trees/${gh_branch}?recursive=1`,
      accessToken: access_token,
      cacheOptions: {
        cache: "no-store",
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to fetch GitHub repository tree ${gh_repository}: ${error}`,
    );
  }
};

export const fetchGitHubFile = async ({
  gh_repository,
  gh_branch,
  path,
  access_token,
}: {
  gh_repository: string;
  gh_branch: string;
  path: string;
  access_token: string;
}) => {
  try {
    return await githubJsonFetch<GitHubAPIFileContent>({
      // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
      url: `/repos/${gh_repository}/contents/${path}?ref=${gh_branch}`,
      accessToken: access_token,
      cacheOptions: {
        cache: "no-store",
      },
    });
  } catch (error) {
    throw new Error(
      `Could not read ${gh_repository}/${path} from GitHub: ${error}`,
    );
  }
};

export const fetchGitHubFileBlob = async ({
  gh_repository,
  file_sha,
  access_token,
}: {
  gh_repository: string;
  file_sha: string;
  access_token: string;
}) => {
  try {
    return await githubRawFetch({
      // https://docs.github.com/en/rest/git/blobs?apiVersion=2022-11-28#get-a-blob
      url: `/repos/${gh_repository}/git/blobs/${file_sha}`,
      accessToken: access_token,
      cacheOptions: {
        cache: "no-store",
      },
    });
  } catch (error) {
    throw new Error(
      `Could not read ${gh_repository}/git/blob/${file_sha} from GitHub: ${error}`,
    );
  }
};

export const checkIfBranchExists = async ({
  gh_repository,
  gh_branch,
  access_token,
}: {
  gh_repository: string;
  gh_branch: string;
  access_token: string;
}) => {
  try {
    return await githubFetch({
      // https://docs.github.com/en/rest/branches/branches?apiVersion=2022-11-28#get-a-branch
      url: `/repos/${gh_repository}/branches/${gh_branch}`,
      accessToken: access_token,
      cacheOptions: {
        cache: "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === "NOT_FOUND") {
        return false;
      }
      throw new TRPCError(error);
    }
  }
};

export const fetchGitHubRepo = async ({
  gh_repository,
  access_token,
}: {
  gh_repository: string;
  access_token?: string;
}) => {
  try {
    return await githubJsonFetch<GitHubAPIRepository>({
      // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#get-a-repository
      url: `/repos/${gh_repository}`,
      accessToken: access_token,
    });
  } catch (error) {
    throw new Error(`Could not read ${gh_repository} from GitHub: ${error}`);
  }
};

export const fetchGitHubRepoContributors = async ({
  gh_repository,
  access_token,
}: {
  gh_repository: string;
  access_token?: string;
}) => {
  try {
    return await githubJsonFetch<GitHubAPIContributor[]>({
      // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repository-contributors
      url: `/repos/${gh_repository}/contributors`,
      accessToken: access_token,
    });
  } catch (error) {
    throw new Error(
      `Could not read contributors for ${gh_repository} from GitHub: ${error}`,
    );
  }
};

// export const getGitHubRepoTreeBlobs = async (tree: GitHubAPIRepoTree) => {
//   return tree.tree
//     .filter((file) => file.type === "blob") // only include blobs (files) not trees (folders)
// }

export interface GitHubAPIFileContent {
  type: "file";
  encoding: "base64";
  size: number;
  name: string;
  path: string;
  content: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  download_url: string;
  // ...
}

export interface GitHubAPIRepoTree {
  sha: string;
  url: string;
  tree: GitHubAPIRepoTreeItem[];
}

export interface GitHubAPIRepoTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
  url: string;
}

interface GitHubAPIUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  // ...
}

export interface GitHubAPIContributor {
  login: string;
  id: number;
  // ...
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
  };
  stargazers_count: number;
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
