import { TRPCError } from "@trpc/server";

const githubAPIBaseURL = "https://api.github.com";
const githubAPIVersion = "2022-11-28";

const makeGitHubHeaders = (accessToken: string) => {
  return {
    "X-GitHub-Api-Version": githubAPIVersion,
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
  };
};

export async function githubFetch(url: string, accessToken: string) {
  const response = await fetch(`${githubAPIBaseURL}${url}`, {
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
