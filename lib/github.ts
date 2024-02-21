import { TRPCError } from "@trpc/server";

const githubAPIBaseURL = "https://api.github.com";
const githubAPIVersion = "2022-11-28";

type Accept = "application/vnd.github+json" | "application/vnd.github.raw+json";

const makeGitHubHeaders = (
  accessToken: string,
  accept: Accept = "application/vnd.github+json",
) => {
  return {
    "X-GitHub-Api-Version": githubAPIVersion,
    Authorization: `Bearer ${accessToken}`,
    Accept: accept,
  };
};

export const githubFetch = async ({
  url,
  accessToken,
  cacheOptions,
  accept,
}: {
  url: string;
  accessToken: string;
  cacheOptions?: { next?: any; cache?: any };
  accept?: Accept;
}) => {
  const response = await fetch(`${githubAPIBaseURL}${url}`, {
    headers: makeGitHubHeaders(accessToken, accept),
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
      default:
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch from GitHub: ${response.statusText}`,
        });
    }
  }
  return response;
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
    const response = await githubFetch({
      url: `/repos/${gh_repository}/git/trees/${gh_branch}?recursive=1`,
      accessToken: access_token,
      cacheOptions: {
        cache: "no-store",
      },
    });

    return (await response.json()) as GitHubAPIRepoTree;
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
    const response = await githubFetch({
      // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
      url: `/repos/${gh_repository}/contents/${path}?ref=${gh_branch}`,
      accessToken: access_token,
      cacheOptions: {
        cache: "no-store",
      },
    });

    return (await response.json()) as GitHubAPIFileContent;
  } catch (error) {
    throw new Error(
      `Could not read ${gh_repository}/${path} from GitHub: ${error}`,
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
    const response = await githubFetch({
      url: `/repos/${gh_repository}/branches/${gh_branch}`,
      accessToken: access_token,
      cacheOptions: {
        cache: "no-store",
      },
    });

    return response.ok;
  } catch (error) {
    return false;
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
  tree: Array<{
    path: string;
    mode: string;
    type: "blob" | "tree";
    size: number;
    sha: string;
    url: string;
  }>;
}

export interface GitHubAPIOrganization {
  login: string;
  id: number;
  node_id: string;
  url: string;
  repos_url: string;
  avatar_url: string;
  description: string | null;
  // ...
}

export interface GitHubAPIRepository {
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
}

export interface GitHubScope {
  login: string;
  type: "user" | "organization";
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
}
