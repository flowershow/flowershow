import chalk from "chalk";
import packageJson from "../package.json" with { type: "json" };
import { getAuthHeaders } from "./auth.js";
import { API_URL } from "./const.js";

interface OutdatedClientError {
  error: "client_outdated";
  message: string;
  currentVersion: string;
  minimumVersion: string;
}

/**
 * Check if response is an outdated client error and handle it
 * Exits the process if the CLI is outdated
 */
async function handleOutdatedClient(response: Response): Promise<void> {
  if (response.status === 426) {
    const data = (await response
      .clone()
      .json()
      .catch(() => ({}))) as OutdatedClientError;
    if (data.error === "client_outdated") {
      const lines = [
        "",
        chalk.red.bold(
          `  !  Your Flowershow CLI is outdated (v${data.currentVersion}) `,
        ),
        "",
        `  This version no longer works with the Flowershow API.`,
        `  Please upgrade to v${data.minimumVersion} or newer.`,
        "",
        chalk.cyan(`  → npm install -g @flowershow/publish`),
        "",
      ];

      const width = 56;
      const top = chalk.red(`╔${"═".repeat(width)}╗`);
      const bottom = chalk.red(`╚${"═".repeat(width)}╝`);
      const border = chalk.red("║");

      console.error();
      console.error(top);
      for (const line of lines) {
        const padding = width - stripAnsi(line).length;
        console.error(
          `${border}${line}${" ".repeat(Math.max(0, padding))}${border}`,
        );
      }
      console.error(bottom);
      console.error();

      process.exit(1);
    }
  }
}

/** Strip ANSI codes for length calculation */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

interface Site {
  id: string;
  projectName: string;
  url: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  fileCount?: number;
  totalSize?: number;
  plan?: "FREE" | "PREMIUM";
}

interface CreateSiteResponse {
  site: Site;
}

interface GetSitesResponse {
  sites: Site[];
  total: number;
}

interface GetSiteResponse {
  site: Site;
}

interface DeleteSiteResponse {
  success: boolean;
  message: string;
  deletedFiles: number;
}

interface FileMetadata {
  path: string;
  size: number;
  sha: string;
}

interface UploadUrl {
  path: string;
  uploadUrl: string;
  blobId: string;
  contentType: string;
}

export interface SyncFilesResponse {
  toUpload: UploadUrl[];
  toUpdate: UploadUrl[];
  deleted: string[];
  unchanged: string[];
  summary: {
    toUpload: number;
    toUpdate: number;
    deleted: number;
    unchanged: number;
  };
  dryRun?: boolean;
}

interface BlobStatus {
  id: string;
  path: string;
  syncStatus: "UPLOADING" | "PROCESSING" | "SUCCESS" | "ERROR";
  syncError: string | null;
  extension: string | null;
}

interface SiteStatusResponse {
  siteId: string;
  status: "pending" | "complete" | "error";
  files: {
    total: number;
    pending: number;
    success: number;
    failed: number;
  };
  blobs: BlobStatus[];
}

/**
 * Make an authenticated API request
 * @param endpoint - API endpoint (e.g., '/api/sites')
 * @param options - Fetch options
 * @returns Response object
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const authHeaders = getAuthHeaders();

  const url = `${API_URL}${endpoint}`;
  const headers = {
    "X-Flowershow-CLI-Version": packageJson.version,
    ...options.headers,
    ...(authHeaders || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  await handleOutdatedClient(response);

  return response;
}

/**
 * Create a new site
 * @param projectName - Project name
 * @param overwrite - Whether to overwrite existing site
 * @returns Site data
 */
export async function createSite(
  projectName: string,
  overwrite: boolean = false,
): Promise<CreateSiteResponse> {
  const response = await apiRequest("/api/sites", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectName, overwrite }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      error.message || `Failed to create site: ${response.statusText}`,
    );
  }

  return (await response.json()) as CreateSiteResponse;
}

/**
 * Get list of user's sites from API
 * @returns Sites data
 */
export async function getSites(): Promise<GetSitesResponse> {
  const response = await apiRequest("/api/sites");

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      error.message || `Failed to fetch sites: ${response.statusText}`,
    );
  }

  return (await response.json()) as GetSitesResponse;
}

/**
 * Get a specific site by ID
 * @param siteId - Site ID
 * @returns Site data
 */
export async function getSiteById(siteId: string): Promise<GetSiteResponse> {
  const response = await apiRequest(`/api/sites/id/${siteId}`);

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      error.message || `Failed to fetch site: ${response.statusText}`,
    );
  }

  return (await response.json()) as GetSiteResponse;
}

/**
 * Get a specific site by name
 * @param username - Username of the site owner
 * @param siteName - Site name
 * @returns Site data or null if not found
 */
export async function getSiteByName(
  username: string,
  siteName: string,
): Promise<GetSiteResponse | null> {
  const response = await apiRequest(`/api/sites/${username}/${siteName}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }

    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      error.message || `Failed to fetch site: ${response.statusText}`,
    );
  }

  return (await response.json()) as GetSiteResponse;
}

/**
 * Delete a site
 * @param siteId - Site ID
 * @returns Delete result
 */
export async function deleteSite(siteId: string): Promise<DeleteSiteResponse> {
  const response = await apiRequest(`/api/sites/id/${siteId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      error.message || `Failed to delete site: ${response.statusText}`,
    );
  }

  return (await response.json()) as DeleteSiteResponse;
}

/**
 * Sync files with the server (replaces getUploadUrls for new workflows)
 * @param siteId - Site ID
 * @param files - Array of file metadata
 * @param dryRun - If true, only returns what would happen without making changes
 * @returns Sync plan with upload URLs, deleted files, and unchanged files
 */
export async function syncFiles(
  siteId: string,
  files: FileMetadata[],
  dryRun: boolean = false,
): Promise<SyncFilesResponse> {
  const url = `/api/sites/id/${siteId}/sync${dryRun ? "?dryRun=true" : ""}`;
  const response = await apiRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ files }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      error.message || `Failed to sync files: ${response.statusText}`,
    );
  }

  return (await response.json()) as SyncFilesResponse;
}

/**
 * Upload a file directly to R2 using presigned URL
 * @param uploadUrl - Presigned URL
 * @param content - File content
 * @param contentType - Content type
 * @returns true if successful
 */
export async function uploadToR2(
  uploadUrl: string,
  content: Buffer,
  contentType: string,
): Promise<boolean> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: content,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }

  return true;
}

/**
 * Get site processing status
 * @param siteId - Site ID
 * @returns Site status data
 */
export async function getSiteStatus(
  siteId: string,
): Promise<SiteStatusResponse> {
  const response = await apiRequest(`/api/sites/id/${siteId}/status`);

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      error.message || `Failed to get site status: ${response.statusText}`,
    );
  }

  return (await response.json()) as SiteStatusResponse;
}
