import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { env } from '@/env.mjs';
import { log, SeverityNumber } from '@/lib/otel-logger';
import PostHogClient from '@/lib/server-posthog';
import { db } from '@/server/db';

const githubAPIBaseURL = 'https://api.github.com';
const githubAPIVersion = '2022-11-28';

// ============================================================================
// GitHub App Token Management
// ============================================================================

// In-memory cache for installation tokens (consider Redis for production)
const tokenCache = new Map<
  string,
  {
    token: string;
    expiresAt: Date;
  }
>();

// Mutex to prevent concurrent refresh
const refreshLocks = new Map<string, Promise<string>>();

/**
 * Generate JWT for GitHub App authentication
 */
async function generateGitHubAppJWT(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 600, // 10 minutes
    iss: env.GITHUB_APP_ID,
  };

  // Convert escaped newlines to actual newlines in private key
  const privateKey = env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
  });
}

/**
 * Refresh installation access token
 * @param githubInstallationId - The actual GitHub installation ID (BigInt as string)
 */
async function refreshInstallationToken(
  githubInstallationId: string,
): Promise<string> {
  // Check if refresh is already in progress
  const existingLock = refreshLocks.get(githubInstallationId);
  if (existingLock) {
    return existingLock;
  }

  // Create new refresh promise
  const refreshPromise = (async () => {
    try {
      const jwtToken = await generateGitHubAppJWT();

      const response = await fetch(
        `${githubAPIBaseURL}/app/installations/${githubInstallationId}/access_tokens`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': githubAPIVersion,
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(
          `Failed to refresh GitHub App token: ${response.status} ${response.statusText}`,
        );
        const posthog = PostHogClient();
        posthog.captureException(error, 'system', {
          source: 'lib/github.ts',
          operation: 'refreshInstallationToken',
          installationId: githubInstallationId,
          status: response.status,
          errorBody,
        });
        await posthog.shutdown();
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();
      const expiresAt = new Date(data.expires_at);

      // Cache the token
      tokenCache.set(githubInstallationId, {
        token: data.token,
        expiresAt,
      });

      log('Refresh GitHub App Installation Token', SeverityNumber.INFO, {
        installation_id: githubInstallationId,
        expires_at: data.expires_at,
      });

      return data.token;
    } catch (error) {
      const posthog = PostHogClient();
      posthog.captureException(error, 'system', {
        source: 'lib/github.ts',
        operation: 'refreshInstallationToken',
      });
      await posthog.shutdown();
      throw error;
    } finally {
      refreshLocks.delete(githubInstallationId);
    }
  })();

  refreshLocks.set(githubInstallationId, refreshPromise);
  return refreshPromise;
}

/**
 * Get installation access token (with caching and auto-refresh)
 * @param installationDbId - The database CUID for the GitHubInstallation record
 */
export async function getInstallationToken(
  installationDbId: string,
): Promise<string> {
  // Look up the actual GitHub installation ID from the database
  const installation = await db.gitHubInstallation.findUnique({
    where: { id: installationDbId },
    select: { installationId: true },
  });

  if (!installation) {
    throw new Error(
      `GitHub installation not found for database ID: ${installationDbId}`,
    );
  }

  const githubInstallationId = installation.installationId.toString();
  const cached = tokenCache.get(githubInstallationId);

  // Refresh if token expires in < 5 minutes
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (!cached || cached.expiresAt < fiveMinutesFromNow) {
    return refreshInstallationToken(githubInstallationId);
  }

  return cached.token;
}

/**
 * Clear cached token for an installation (useful after revocation)
 * @param githubInstallationId - The actual GitHub installation ID (BigInt as string)
 */
export function clearInstallationTokenCache(
  githubInstallationId: string,
): void {
  tokenCache.delete(githubInstallationId);
}

// ============================================================================
// GitHub API Helpers
// ============================================================================

type Accept = 'application/vnd.github+json' | 'application/vnd.github.raw+json';

const makeGitHubHeaders = ({
  accessToken,
  accept = 'application/vnd.github+json',
}: {
  accessToken?: string;
  accept?: Accept;
}): HeadersInit => {
  const headers: Record<string, string> = {
    'X-GitHub-Api-Version': githubAPIVersion,
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
  method,
  body,
}: {
  url: string;
  accessToken?: string;
  cacheOptions?: { next?: any; cache?: RequestCache };
  accept?: Accept;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
}) => {
  const response = await fetch(`${githubAPIBaseURL}${url}`, {
    headers: makeGitHubHeaders({ accessToken, accept }),
    method,
    body: body ? JSON.stringify(body) : undefined,
    ...cacheOptions,
  });
  if (!response.ok) {
    const statusCode = response.status;
    switch (statusCode) {
      case 401:
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid GitHub access token. Signing out...',
          cause: `${response.json()}`,
        });
      case 403:
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access to the GitHub resource is forbidden',
          cause: `${response.json()}`,
        });
      case 404:
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'GitHub resource not found',
          cause: `${response.json()}`,
        });
      default:
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch from GitHub',
          cause: `${response.json()}`,
        });
    }
  }
  return response;
};

export const githubJsonFetch = async <T>({
  url,
  accessToken,
  cacheOptions,
  method,
  body,
}: {
  url: string;
  queryParams?: Record<string, string>;
  accessToken?: string;
  cacheOptions?: { next?: any; cache?: RequestCache };
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
}) => {
  const response = await githubFetch({
    url,
    accessToken,
    cacheOptions,
    method,
    body,
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
  cacheOptions?: { next?: any; cache?: RequestCache };
}) => {
  const response = await githubFetch({
    url,
    accessToken,
    cacheOptions,
    accept: 'application/vnd.github.raw+json',
  });

  return await response.blob();
};

export const fetchGitHubScopes = async (accessToken: string) => {
  // Fetching organizations the user is a member of.
  // https://docs.github.com/en/rest/orgs/orgs?apiVersion=2022-11-28#list-organizations-for-the-authenticated-user
  const orgs = await githubJsonFetch<GitHubAPIOrganization[]>({
    url: `/user/orgs`,
    accessToken,
    cacheOptions: {
      cache: 'no-store',
    },
  });

  // Fetching the user's own account information.
  // https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
  const user = await githubJsonFetch<GitHubAPIUser>({
    url: `/user`,
    accessToken,
    cacheOptions: {
      cache: 'no-store',
    },
  });

  // Combining both orgs and the user's GitHub login as selectable scopes.
  return [
    { login: user.login, type: 'User', avatar_url: user.avatar_url },
  ].concat(
    orgs.map((org) => ({
      login: org.login,
      type: 'Organization',
      avatar_url: org.avatar_url,
    })),
  ) as GitHubScope[];
};

export const fetchGitHubScopeRepositories = async ({
  scope = 'self',
  accessToken,
}: {
  scope: 'self' | string; // self means the user's own repositories
  accessToken: string;
}) => {
  let page = 1;
  let allRepos: GitHubRepository[] = [];
  let hasNextPage = false;
  let scopeReposUrl: string;

  const urlParams = new URLSearchParams({
    per_page: '100',
  });

  if (scope === 'self') {
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repositories-for-the-authenticated-user
    scopeReposUrl = `/user/repos`;
    urlParams.set('affiliation', 'owner,collaborator');
  } else {
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-organization-repositories
    scopeReposUrl = `/orgs/${scope}/repos`;
  }
  do {
    urlParams.set('page', `${page}`);
    const response = await githubFetch({
      url: `${scopeReposUrl}?${urlParams.toString()}`,
      accessToken,
      cacheOptions: {
        cache: 'no-store',
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

    const linkHeader = response.headers.get('link');

    hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;
    page++;
  } while (hasNextPage);

  // sort alphabetically by name
  allRepos.sort((a, b) => a.name.localeCompare(b.name));
  return allRepos;
};

export const fetchGitHubRepoTree = async ({
  ghRepository,
  ghBranch,
  accessToken,
  installationId,
}: {
  ghRepository: string;
  ghBranch: string;
  accessToken?: string; // Legacy OAuth token (optional for backward compatibility)
  installationId?: string; // GitHub App installation DB ID
}) => {
  // Prefer installation token over OAuth token
  const token = installationId
    ? await getInstallationToken(installationId)
    : accessToken;

  if (!token) {
    throw new Error('Either accessToken or installationId must be provided');
  }

  return await githubJsonFetch<GitHubAPIRepoTree>({
    url: `/repos/${ghRepository}/git/trees/${ghBranch}?recursive=1`,
    accessToken: token,
    cacheOptions: {
      cache: 'no-store',
    },
  });
};

export const fetchGitHubFile = async ({
  ghRepository,
  ghBranch,
  path,
  accessToken,
}: {
  ghRepository: string;
  ghBranch: string;
  path: string;
  accessToken: string;
}) => {
  try {
    return await githubJsonFetch<GitHubAPIFileContent>({
      // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
      url: `/repos/${ghRepository}/contents/${path}?ref=${ghBranch}`,
      accessToken: accessToken,
      cacheOptions: {
        cache: 'no-store',
      },
    });
  } catch (error) {
    throw new Error(
      `Could not read ${ghRepository}/${path} from GitHub: ${error}`,
    );
  }
};

export const fetchGitHubFileRaw = async ({
  ghRepository,
  file_sha,
  accessToken,
  installationId,
}: {
  ghRepository: string;
  file_sha: string;
  accessToken?: string; // Legacy OAuth token (optional for backward compatibility)
  installationId?: string; // GitHub App installation DB ID
}) => {
  // Prefer installation token over OAuth token
  const token = installationId
    ? await getInstallationToken(installationId)
    : accessToken;

  if (!token) {
    throw new Error('Either accessToken or installationId must be provided');
  }

  return await githubRawFetch({
    // https://docs.github.com/en/rest/git/blobs?apiVersion=2022-11-28#get-a-blob
    url: `/repos/${ghRepository}/git/blobs/${file_sha}`,
    accessToken: token,
    cacheOptions: {
      cache: 'no-store',
    },
  });
};

export const checkIfBranchExists = async ({
  ghRepository,
  ghBranch,
  accessToken,
  installationId,
}: {
  ghRepository: string;
  ghBranch: string;
  accessToken: string;
  installationId?: string; // Database CUID from GitHubInstallation table
}) => {
  // Use installation token if available, otherwise use OAuth token
  const token = installationId
    ? await getInstallationToken(installationId)
    : accessToken;

  try {
    return await githubFetch({
      // https://docs.github.com/en/rest/branches/branches?apiVersion=2022-11-28#get-a-branch
      url: `/repos/${ghRepository}/branches/${ghBranch}`,
      accessToken: token,
      cacheOptions: {
        cache: 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'NOT_FOUND') {
        return false;
      }
      throw new TRPCError(error);
    }
  }
};

export const fetchGitHubRepo = async ({
  ghRepository,
  accessToken,
}: {
  ghRepository: string;
  accessToken?: string;
}) => {
  try {
    return await githubJsonFetch<GitHubAPIRepository>({
      // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#get-a-repository
      url: `/repos/${ghRepository}`,
      accessToken: accessToken,
    });
  } catch (error) {
    throw new Error(`Could not read ${ghRepository} from GitHub: ${error}`);
  }
};

export const fetchGitHubRepoContributors = async ({
  ghRepository,
  accessToken,
}: {
  ghRepository: string;
  accessToken?: string;
}) => {
  try {
    return await githubJsonFetch<GitHubAPIContributor[]>({
      // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repository-contributors
      url: `/repos/${ghRepository}/contributors`,
      accessToken: accessToken,
    });
  } catch (error) {
    throw new Error(
      `Could not read contributors for ${ghRepository} from GitHub: ${error}`,
    );
  }
};

export const createGitHubRepoWebhook = async ({
  ghRepository,
  accessToken,
  installationId,
  webhookUrl,
}: {
  ghRepository: string;
  accessToken: string;
  installationId?: string; // Database CUID from GitHubInstallation table
  webhookUrl?: string;
}) => {
  // Use installation token if available, otherwise use OAuth token
  const token = installationId
    ? await getInstallationToken(installationId)
    : accessToken;

  // Note: If you're getting "Unprocessable entity" error from GitHub,
  // there is a chance that the webhook with the same URL already exists.
  return await githubJsonFetch<GitHubAPIWebhook>({
    // https://docs.github.com/en/rest/repos/webhooks?apiVersion=2022-11-28#create-a-repository-webhook
    url: `/repos/${ghRepository}/hooks`,
    accessToken: token,
    method: 'POST',
    body: {
      name: 'web',
      active: true,
      events: ['push'],
      config: {
        content_type: 'json',
        url: webhookUrl,
        secret: env.GH_WEBHOOK_SECRET,
      },
    },
  });
};

export const deleteGitHubRepoWebhook = async ({
  ghRepository,
  webhook_id,
  accessToken,
}: {
  ghRepository: string;
  webhook_id: number;
  accessToken: string;
}) => {
  return await githubFetch({
    // https://docs.github.com/en/rest/repos/webhooks?apiVersion=2022-11-28#delete-a-repository-webhook
    url: `/repos/${ghRepository}/hooks/${webhook_id}`,
    accessToken: accessToken,
    method: 'DELETE',
  });
};

// export const getGitHubRepoTreeBlobs = async (tree: GitHubAPIRepoTree) => {
//   return tree.tree
//     .filter((file) => file.type === "blob") // only include blobs (files) not trees (folders)
// }

export const submitGitHubIssue = async ({
  ghRepository,
  title,
  body,
  labels,
  accessToken,
}: {
  ghRepository: string;
  title: string;
  body: string;
  labels?: string[];
  accessToken: string;
}) => {
  return await githubJsonFetch<GitHubAPIIssue>({
    // https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#create-an-issue
    url: `/repos/${ghRepository}/issues`,
    accessToken: accessToken,
    method: 'POST',
    body: {
      title,
      body,
      labels,
    },
  });
};

export const getFileLastCommitTimestamp = async ({
  ghRepository,
  branch,
  file_path,
  accessToken,
}: {
  ghRepository: string;
  branch: string;
  file_path: string;
  accessToken: string;
}) => {
  const queryParams = new URLSearchParams({
    sha: branch,
    path: file_path,
    per_page: '1',
  });
  const commits = await githubJsonFetch<GitHubAPICommit[]>({
    // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#list-commits
    url: `/repos/${ghRepository}/commits?${queryParams.toString()}`,
    accessToken: accessToken,
  });

  if (commits.length === 0) {
    return null;
  }

  return commits[0]!.commit.author.date;
};

export interface GitHubAPIFileContent {
  type: 'file';
  encoding: 'base64';
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
  type: 'blob' | 'tree';
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

interface GitHubAPIWebhook {
  id: number;
  active: boolean;
  events: string[];
  // ...
}

interface GitHubAPIIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  labels: string[];
  // ...
}

interface GitHubAPICommit {
  sha: string;
  commit: {
    author: {
      date: string;
      // ...
    };
  };
  // ...
}

interface GitHubScope {
  login: string;
  type: 'user' | 'organization';
  avatar_url: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
}
